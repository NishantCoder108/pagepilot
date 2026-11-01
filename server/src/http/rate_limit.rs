use std::{collections::HashMap, net::IpAddr, time::Instant};

#[derive(Default)]
pub(crate) struct RateLimiter {
    entries: HashMap<IpAddr, (Instant, usize)>,
}

impl RateLimiter {
    pub(super) fn allow(&mut self, ip: IpAddr, limit: usize) -> bool {
        self.entries
            .retain(|_, (start, _)| start.elapsed().as_secs() < 60);
        if !self.entries.contains_key(&ip) && self.entries.len() >= 10_000 {
            return false;
        }
        let (_, count) = self
            .entries
            .entry(ip)
            .or_insert_with(|| (Instant::now(), 0));
        if *count >= limit {
            return false;
        }
        *count += 1;
        true
    }
}
