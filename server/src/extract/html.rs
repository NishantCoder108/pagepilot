use super::text::from_text;
use crate::{error::ApiError, types::Document};
use dom_smoothie::Readability;
use scraper::{Html, Selector};

pub(super) fn from_html(html: &str, source: &str, max: usize) -> Result<Document, ApiError> {
    let mut reader = Readability::new(html.to_owned(), Some(source), None).map_err(|_| {
        ApiError::bad(
            "extraction_failed",
            "This page could not be read. Paste its text instead.",
        )
    })?;
    let article = reader.parse().map_err(|_| ApiError::bad("extraction_failed", "No readable article was found. The page may require JavaScript or login. Try pasted text."))?;
    let fragment = Html::parse_fragment(article.content.as_ref());
    let selector = Selector::parse("h1,h2,h3,h4,h5,h6,p,li,pre,blockquote,td").unwrap();
    let mut blocks = Vec::new();
    for element in fragment.select(&selector) {
        // Avoid duplicating text from nested selected blocks (e.g. pre in li).
        if element
            .ancestors()
            .skip(1)
            .filter_map(scraper::ElementRef::wrap)
            .any(|p| matches!(p.value().name(), "p" | "li" | "pre" | "blockquote" | "td"))
        {
            continue;
        }
        let raw = element.text().collect::<Vec<_>>().join("");
        let text = if element.value().name() == "pre" {
            raw.trim().to_owned()
        } else {
            raw.split_whitespace().collect::<Vec<_>>().join(" ")
        };
        if text.is_empty() {
            continue;
        }
        if matches!(
            element.value().name(),
            "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
        ) {
            blocks.push(format!("## {text}"));
        } else {
            blocks.push(text);
        }
    }
    if blocks.is_empty() {
        blocks.push(article.text_content.to_string());
    }
    let mut document = from_text(&blocks.join("\n\n"), &article.title, max)?;
    if document.title.is_empty() {
        document.title = "Untitled page".into();
    }
    document.source_url = Some(source.into());
    Ok(document)
}
