use crate::error::ApiError;
use std::net::IpAddr;
use url::{Host, Url};

pub(super) fn is_public(ip: IpAddr) -> bool {
    // Conservative globally routable set. Includes documentation/benchmark ranges
    // so they cannot become surprising routes in a host's local network.
    const V4_DENY: &[&str] = &[
        "0.0.0.0/8",
        "10.0.0.0/8",
        "100.64.0.0/10",
        "127.0.0.0/8",
        "169.254.0.0/16",
        "172.16.0.0/12",
        "192.0.0.0/24",
        "192.0.2.0/24",
        "192.88.99.0/24",
        "192.168.0.0/16",
        "198.18.0.0/15",
        "198.51.100.0/24",
        "203.0.113.0/24",
        "224.0.0.0/4",
        "240.0.0.0/4",
    ];
    match ip {
        IpAddr::V4(_) => !V4_DENY
            .iter()
            .any(|cidr| cidr.parse::<ipnet::IpNet>().unwrap().contains(&ip)),
        IpAddr::V6(_) => {
            "2000::/3".parse::<ipnet::IpNet>().unwrap().contains(&ip)
                && !["2001::/23", "2001:db8::/32", "2002::/16", "3fff::/20"]
                    .iter()
                    .any(|cidr| cidr.parse::<ipnet::IpNet>().unwrap().contains(&ip))
        }
    }
}

pub(super) fn validate_url(raw: &str) -> Result<Url, ApiError> {
    let url = Url::parse(raw)
        .map_err(|_| ApiError::bad("invalid_url", "Enter a complete HTTP or HTTPS URL."))?;
    if !matches!(url.scheme(), "http" | "https")
        || url.host().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || !matches!(url.port_or_known_default(), Some(80 | 443))
    {
        return Err(ApiError::bad(
            "unsafe_url",
            "Only public HTTP/HTTPS URLs on ports 80 or 443 without credentials are supported.",
        ));
    }
    if let Some(host) = url.host() {
        let ip = match host {
            Host::Ipv4(v) => Some(IpAddr::V4(v)),
            Host::Ipv6(v) => Some(IpAddr::V6(v)),
            Host::Domain(_) => None,
        };
        if ip.is_some_and(|v| !is_public(v)) {
            return Err(unsafe_destination());
        }
    }
    Ok(url)
}

pub(super) fn unsafe_destination() -> ApiError {
    ApiError::bad(
        "unsafe_destination",
        "This address is not a public website. Internal and reserved networks are blocked.",
    )
}
