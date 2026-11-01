use regex::Regex;
use std::{collections::HashSet, sync::OnceLock};

pub(super) fn citations(text: &str, valid: &HashSet<String>) -> Vec<String> {
    static RE: OnceLock<Regex> = OnceLock::new();
    let re = RE.get_or_init(|| Regex::new(r"\[(p[0-9]+)\]").unwrap());
    let mut seen = HashSet::new();
    re.captures_iter(text)
        .filter_map(|c| {
            let id = c[1].to_owned();
            (valid.contains(&id) && seen.insert(id.clone())).then_some(id)
        })
        .collect()
}
