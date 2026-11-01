use std::{env, net::SocketAddr, sync::Arc, time::Duration};
use tokio::sync::Semaphore;

pub struct Config {
    pub origins: crate::origin::OriginPolicy,
    pub serve_frontend: bool,
    pub bind: SocketAddr,
    pub fetch_slots: usize,
    pub parse_slots: usize,
    pub generation_slots: usize,
    pub request_slots: usize,
    pub request_timeout: Duration,
    pub fetch_timeout: Duration,
    pub generation_timeout: Duration,
    pub max_download_bytes: usize,
    pub max_document_bytes: usize,
    pub max_request_bytes: usize,
    pub requests_per_minute: usize,
    pub web_dir: String,
}

fn number(name: &str, default: usize) -> usize {
    env::var(name)
        .map(|v| {
            v.parse::<usize>()
                .ok()
                .filter(|n| *n > 0)
                .unwrap_or_else(|| panic!("{name} must be a positive integer"))
        })
        .unwrap_or(default)
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            origins: crate::origin::OriginPolicy::from_list(
                &env::var("ALLOWED_ORIGINS").unwrap_or_default(),
            )
            .expect("ALLOWED_ORIGINS must contain exact HTTPS origins or localhost HTTP origins"),
            serve_frontend: env::var("SERVE_FRONTEND")
                .map(|v| {
                    v.parse::<bool>()
                        .expect("SERVE_FRONTEND must be true or false")
                })
                .unwrap_or(true),
            bind: env::var("BIND_ADDR")
                .unwrap_or_else(|_| "127.0.0.1:3000".into())
                .parse()
                .expect("BIND_ADDR must be an IP:port"),
            fetch_slots: number("FETCH_CONCURRENCY", 16),
            parse_slots: number("PARSE_CONCURRENCY", 2),
            generation_slots: number("GENERATION_CONCURRENCY", 16),
            request_slots: number("REQUEST_CONCURRENCY", 64),
            request_timeout: Duration::from_secs(number("REQUEST_TIMEOUT_SECONDS", 30) as u64),
            fetch_timeout: Duration::from_secs(number("FETCH_TIMEOUT_SECONDS", 20) as u64),
            generation_timeout: Duration::from_secs(
                number("GENERATION_TIMEOUT_SECONDS", 120) as u64
            ),
            max_download_bytes: number("MAX_DOWNLOAD_BYTES", 2_000_000),
            max_document_bytes: number("MAX_DOCUMENT_BYTES", 200_000),
            max_request_bytes: number("MAX_REQUEST_BYTES", 1_000_000),
            requests_per_minute: number("REQUESTS_PER_MINUTE", 30),
            web_dir: env::var("WEB_DIR").unwrap_or_else(|_| "web/dist".into()),
        }
    }
}

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub fetch_slots: Arc<Semaphore>,
    pub parse_slots: Arc<Semaphore>,
    pub generation_slots: Arc<Semaphore>,
    pub request_slots: Arc<Semaphore>,
    pub provider_client: reqwest::Client,
    pub rates: Arc<std::sync::Mutex<crate::http::RateLimiter>>,
}

impl AppState {
    pub fn new(config: Config) -> Self {
        Self {
            fetch_slots: Arc::new(Semaphore::new(config.fetch_slots)),
            parse_slots: Arc::new(Semaphore::new(config.parse_slots)),
            generation_slots: Arc::new(Semaphore::new(config.generation_slots)),
            request_slots: Arc::new(Semaphore::new(config.request_slots)),
            provider_client: reqwest::Client::builder()
                .no_proxy()
                .redirect(reqwest::redirect::Policy::none())
                .connect_timeout(Duration::from_secs(10))
                .timeout(config.generation_timeout)
                .build()
                .expect("HTTP client"),
            config: Arc::new(config),
            rates: Arc::new(std::sync::Mutex::new(crate::http::RateLimiter::default())),
        }
    }
}
