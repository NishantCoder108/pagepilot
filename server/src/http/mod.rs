mod handlers;
mod rate_limit;
mod routes;
mod safeguards;

pub(crate) use rate_limit::RateLimiter;
pub(crate) use routes::app;

mod cors;
#[cfg(test)]
mod cors_tests;
#[cfg(test)]
mod tests;
