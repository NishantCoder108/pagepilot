use super::*;
#[test]
fn text_is_ordered_and_headings_survive() {
    let doc = from_text(
        "# Title\n\nFirst passage.\n\n## Details\n\nSecond passage.",
        "Demo",
        1000,
    )
    .unwrap();
    assert_eq!(doc.passages.len(), 2);
    assert_eq!(doc.passages[1].id, "p2");
    assert_eq!(doc.passages[1].heading.as_deref(), Some("Details"));
    assert!(from_text(" ", "Empty", 1000).is_err());
    assert!(from_text("oversized", "Big", 2).is_err());
    assert!(from_text(&"x\n\n".repeat(2001), "Fragmented", 200_000).is_err());
    assert!(
        from_text(
            &format!("# {}\n\nBody", "x".repeat(1001)),
            "Heading",
            200_000
        )
        .is_err()
    );
}
#[test]
fn extracts_article_and_documentation_fixtures() {
    for html in [
        include_str!("../../tests/fixtures/article.html"),
        include_str!("../../tests/fixtures/docs.html"),
    ] {
        let doc = from_html(html, "https://example.com/article", 200_000).unwrap();
        let content = doc
            .passages
            .iter()
            .map(|p| p.text.as_str())
            .collect::<Vec<_>>()
            .join(" ");
        assert!(content.contains("Tokio"));
        assert!(!content.contains("EVIL_SCRIPT"));
        assert!(!content.contains("COOKIE_BANNER"));
        assert!(doc.passages.iter().any(|p| p.heading.is_some()));
    }
}
