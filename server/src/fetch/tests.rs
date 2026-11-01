use super::safety::{is_public, validate_url};
#[test]
fn rejects_internal_and_special_networks() {
    for ip in [
        "127.0.0.1",
        "10.1.2.3",
        "100.100.100.200",
        "169.254.169.254",
        "172.20.1.1",
        "192.168.1.1",
        "0.0.0.0",
        "224.0.0.1",
        "198.18.0.1",
        "::1",
        "::ffff:127.0.0.1",
        "fc00::1",
        "fe80::1",
        "2002:7f00:1::",
        "2001:db8::1",
    ] {
        assert!(!is_public(ip.parse().unwrap()), "{ip}");
    }
    for ip in ["93.184.216.34", "1.1.1.1", "2606:4700:4700::1111"] {
        assert!(is_public(ip.parse().unwrap()));
    }
}
#[test]
fn validates_every_redirect_destination() {
    let base = validate_url("https://example.com/article").unwrap();
    for target in [
        "http://127.1/",
        "//169.254.169.254/latest",
        "http://[::ffff:127.0.0.1]/",
        "file:///etc/passwd",
        "https://user:secret@example.com",
        "http://example.com:8080/",
        "http://2130706433/",
    ] {
        let next = base.join(target).unwrap();
        assert!(validate_url(next.as_str()).is_err(), "{target}");
    }
    assert!(validate_url(base.join("/other").unwrap().as_str()).is_ok());
}
