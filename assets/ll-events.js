/* Listing analytics for Mining Industry Reviews.
   Fires listing_view (50% visible, once per card per page load) and
   listing_click (outbound links, beacon). Also forces rel="sponsored noopener"
   on paid-placement components so those links cannot be forgotten. */
(function () {
  var PAID_LINK_SELECTOR = ".sponsored-box a, .paid-listing a, .sponsored-article a";
  var CARD_SELECTOR = ".co-card";

  function listSlug() {
    var file = (location.pathname.split("/").pop() || "home").replace(/\.html$/, "");
    return file || "home";
  }

  function slugify(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function textOf(el) {
    return el ? (el.textContent || "").replace(/\s+/g, " ").trim() : "";
  }

  function businessName(card) {
    return card.getAttribute("data-business-name") || textOf(card.querySelector(".co-name"));
  }

  function rankOf(card) {
    if (card.getAttribute("data-rank")) return card.getAttribute("data-rank");
    var raw = textOf(card.querySelector(".co-rank")).replace(/^#/, "");
    return raw;
  }

  function placementOf(card) {
    if (card.closest(".sponsored-box")) return "sponsored";
    if (card.closest(".paid-listing") || card.classList.contains("paid-listing")) return "verified";
    return card.getAttribute("data-placement") || "organic";
  }

  function linkType(anchor) {
    var href = anchor.getAttribute("href") || "";
    if (/^tel:/i.test(href)) return "phone";
    if (/book|reserv|schedul|calendly/i.test(href)) return "booking";
    if (/^https?:/i.test(href)) return "website";
    return "other";
  }

  function isOutbound(anchor) {
    var href = anchor.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#" || /^mailto:/i.test(href)) return false;
    try {
      return new URL(href, location.href).hostname !== location.hostname;
    } catch (err) {
      return false;
    }
  }

  function stamp(card) {
    var name = businessName(card);
    var id = card.getAttribute("data-business-id") || slugify(name);
    var list = card.getAttribute("data-list") || listSlug();
    var rank = rankOf(card);
    var placement = placementOf(card);
    card.setAttribute("data-business-id", id);
    if (name) card.setAttribute("data-business-name", name);
    card.setAttribute("data-list", list);
    card.setAttribute("data-rank", rank);
    card.setAttribute("data-placement", placement);
    return {
      business_id: id,
      business_name: name,
      list_slug: list,
      site: location.hostname,
      rank: rank,
      placement: placement
    };
  }

  function enforceSponsoredRel() {
    document.querySelectorAll(PAID_LINK_SELECTOR).forEach(function (anchor) {
      anchor.setAttribute("rel", "sponsored noopener");
    });
  }

  function track() {
    enforceSponsoredRel();
    var cards = document.querySelectorAll(CARD_SELECTOR);
    cards.forEach(stamp);

    if (typeof gtag === "function") {
      if (!("IntersectionObserver" in window)) {
        cards.forEach(function (card) {
          gtag("event", "listing_view", stamp(card));
        });
      } else {
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting || entry.intersectionRatio < 0.5) return;
            var card = entry.target;
            if (card.getAttribute("data-viewed") === "1") return;
            card.setAttribute("data-viewed", "1");
            gtag("event", "listing_view", stamp(card));
            observer.unobserve(card);
          });
        }, { threshold: [0.5] });
        cards.forEach(function (card) { observer.observe(card); });
      }

      document.addEventListener("click", function (event) {
        var anchor = event.target.closest ? event.target.closest("a") : null;
        if (!anchor || !isOutbound(anchor)) return;
        var card = anchor.closest(CARD_SELECTOR);
        if (!card) return;
        var params = stamp(card);
        params.link_type = linkType(anchor);
        params.transport_type = "beacon";
        gtag("event", "listing_click", params);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", track);
  } else {
    track();
  }
})();
