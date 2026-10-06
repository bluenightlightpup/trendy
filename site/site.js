/* Trendy website: tiny Decode demo + copy buttons. No network requests, no storage. */
(function () {
  "use strict";

  // A few real entries copied from web/data/slang.json (the same lexicon the apps use).
  var ENTRIES = [
    {
      "label": "67",
      "terms": [
        "67",
        "6 7",
        "6-7",
        "six seven",
        "six-seven",
        "six7"
      ],
      "short": "Gen Alpha / TikTok brainrot catchphrase — yelled for the bit, not a literal code.",
      "explain": "Kids shout ‘six seven’ with a hand gesture because the sound/meme is the joke. There isn’t a hidden dictionary meaning; participating in the noise is the point. You’re not late for asking.",
      "origin": "TikTok sounds (notably Skrilla’s “Doot Doot (6 7)”) and hallway copycat energy.",
      "age": "Gen Alpha — mostly kids/tweens right now",
      "worlds": [
        "TikTok"
      ]
    },
    {
      "label": "rizz",
      "terms": [
        "rizz",
        "rizzed",
        "rizzler",
        "unspoken rizz",
        "rizzless",
        "w rizz",
        "l rizz",
        "the rizzler",
        "rizz up",
        "rizz god"
      ],
      "short": "Charisma / flirting game — “W rizz” good, “L rizz” bad.",
      "explain": "Can be serious compliment or joke. Oxford’s 2023 Word of the Year spotlight cemented it.",
      "origin": "Popularized by Kai Cenat and stream culture; exploded on TikTok; Oxford Word of the Year 2023.",
      "age": "Gen Z — mostly teens and early twenties",
      "worlds": [
        "TikTok",
        "Streaming"
      ]
    },
    {
      "label": "nah, I’d win",
      "terms": [
        "nah I'd win",
        "nah id win",
        "nah, I'd win",
        "nah, id win",
        "I'd win",
        "id win",
        "nah i would win",
        "nah id win meme",
        "gojo nah I'd win",
        "gojo I'd win"
      ],
      "short": "Defiant confidence after a challenge — “nope, I’d still win.” Often half-joke swagger (or ironic doom).",
      "explain": "People drop “nah, I’d win” when they want Gojo-level cocky energy: someone asks if you’d lose, and you answer like defeat isn’t on the table. Online it’s also used ironically when you definitely will not win. Judgment-free: it’s a meme catchphrase, not a personality diagnosis.",
      "origin": "Jujutsu Kaisen manga: Satoru Gojo’s line (notably Ch. 221 callback to Ch. 3). English “Nah, I’d win” wording spread via VIZ/fan translations; exploded as an exploitable panel + TikTok/anime-Twitter meme in late 2023.",
      "age": "Gen Z — mostly teens and early twenties",
      "worlds": [
        "Anime",
        "TikTok",
        "Twitter"
      ]
    },
    {
      "label": "aura",
      "terms": [
        "aura",
        "aura farming",
        "aura points",
        "lost aura",
        "gained aura",
        "negative aura",
        "aura loss",
        "aura gain"
      ],
      "short": "Invisible cool-points — you gain or lose aura based on how a moment lands.",
      "explain": "“Aura farming” = doing things that look effortlessly cool. Losing aura = the moment was embarrassing.",
      "origin": "Gaming/stream “aura” talk → TikTok scoring social moments like an RPG stat (2024–).",
      "age": "Gen Z — mostly teens and early twenties",
      "worlds": [
        "TikTok",
        "Gaming"
      ]
    },
    {
      "label": "it’s giving",
      "terms": [
        "it's giving",
        "its giving",
        "it's giving ___",
        "giving vibes"
      ],
      "short": "Names the vibe something radiates — “it’s giving main character,” “it’s giving flop.”",
      "explain": "A quick aesthetic/energy read. Often playful or shade-y. Related to “serving” / vibe language. Not literal “giving a gift.”",
      "origin": "Black LGBTQ+ / ballroom and AAVE vernacular → Twitter/TikTok mainstream (esp. ~2020–21).",
      "age": "Gen Z — mostly teens and early twenties",
      "worlds": [
        "TikTok",
        "Twitter",
        "LGBTQ+"
      ]
    },
    {
      "label": "skill issue",
      "terms": [
        "skill issue"
      ],
      "short": "The problem is your skill, not the game (or situation).",
      "explain": "Gaming roast that escaped into general life: failed a task? Skill issue. Often joking.",
      "origin": "Competitive gaming / Twitch chat dunk → general meme slang in the early 2020s.",
      "age": "Gen Z — mostly teens and early twenties",
      "worlds": [
        "Gaming",
        "Internet culture"
      ]
    },
    {
      "label": "delulu",
      "terms": [
        "delulu",
        "delulu is the solulu"
      ],
      "short": "Delusional (often about a crush) — sometimes worn proudly.",
      "explain": "“Delulu is the solulu” = staying hopeful on purpose.",
      "origin": "K-pop / stan spaces → TikTok mainstream.",
      "age": "Gen Z — mostly teens and early twenties",
      "worlds": [
        "K-pop",
        "TikTok"
      ]
    },
    {
      "label": "W",
      "terms": [
        "w",
        "big w",
        "huge w",
        "massive w",
        "dub",
        "take the w",
        "took the w"
      ],
      "short": "A win — something good happened, or something/someone is great.",
      "explain": "“W” is shorthand for a win, literal or not: “that’s a W”, “W friend”, “huge W”. It’s a quick thumbs-up in chats and comments. Its opposite is L (a loss).",
      "origin": "Sports win–loss records (W–L columns) → gaming and streaming chat → TikTok and Twitch comment shorthand in the late 2010s.",
      "age": "Gen Z — mostly teens and early twenties",
      "worlds": [
        "Sports",
        "Internet culture"
      ]
    },
    {
      "label": "glazing",
      "terms": [
        "glazing",
        "glaze",
        "glazed",
        "stop glazing"
      ],
      "short": "Over-praising someone — hype that feels excessive.",
      "explain": "Callout for bootlicking energy. Not about donuts.",
      "origin": "AAVE/rap slang → TikTok captions and live chat.",
      "age": "Gen Z — mostly teens and early twenties",
      "worlds": [
        "TikTok",
        "Streaming"
      ]
    },
    {
      "label": "crash out",
      "terms": [
        "crash out",
        "crashing out",
        "crashed out"
      ],
      "short": "Lose composure — spiral, fight, or emotionally explode.",
      "explain": "Can be literal drama or exaggerated “I almost crashed out.”",
      "origin": "AAVE → TikTok/Twitter mainstream.",
      "age": "Gen Z — mostly teens and early twenties",
      "worlds": [
        "TikTok",
        "Twitter"
      ]
    }
  ];

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[\u2018\u2019\u02bc`]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/['"]/g, "")
      .replace(/[?!.,:;]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractTerm(q) {
    var s = norm(q);
    s = s.replace(/^(what does|what do|whats|what is|what are|what's|define|meaning of|explain)\s+/, "");
    s = s.replace(/\s+(mean|means|meaning)$/, "");
    return s.trim();
  }

  function findEntry(q) {
    var t = extractTerm(q);
    if (!t) return null;
    for (var i = 0; i < ENTRIES.length; i++) {
      var terms = ENTRIES[i].terms;
      for (var j = 0; j < terms.length; j++) {
        if (norm(terms[j]) === t) return ENTRIES[i];
      }
    }
    return null;
  }

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, text) {
    var el = $(id);
    if (el) el.textContent = text;
  }

  function render(entry, query) {
    var answer = $("demo-answer");
    if (!answer) return;
    var tags = $("demo-tags");
    var head = answer.querySelector(".answer-head");
    if (!entry) {
      head.innerHTML = "<span>Not in this demo</span><span>Try the full app</span>";
      setText("demo-term", query);
      setText("demo-short", "This page only carries a handful of sample terms.");
      setText("demo-explain", "The web app checks the whole lexicon, plus about 370 texting abbreviations, and can look single words up in a dictionary.");
      setText("demo-origin", "Open the web app and ask it there.");
      setText("demo-age", "Everyone, judgment-free.");
      tags.innerHTML = "";
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "app/";
      a.textContent = "Open the web app \u2192";
      li.appendChild(a);
      tags.appendChild(li);
      return;
    }
    head.innerHTML = "<span>Trendy lexicon</span><span>Slang meaning</span>";
    setText("demo-term", entry.label);
    setText("demo-short", entry.short);
    setText("demo-explain", entry.explain);
    setText("demo-origin", entry.origin);
    setText("demo-age", entry.age);
    tags.innerHTML = "";
    entry.worlds.forEach(function (w, i) {
      var li = document.createElement("li");
      li.className = "tag " + (i === 0 ? "tag-volt" : "tag-cool");
      li.textContent = w;
      tags.appendChild(li);
    });
  }

  function pressChip(term) {
    var chips = document.querySelectorAll("#demo-chips [data-term]");
    for (var i = 0; i < chips.length; i++) {
      chips[i].setAttribute("aria-pressed", chips[i].getAttribute("data-term") === term ? "true" : "false");
    }
  }

  function initDemo() {
    var chips = $("demo-chips");
    var form = $("demo-form");
    if (!chips || !form) return;
    form.hidden = false;
    chips.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-term]");
      if (!btn) return;
      var term = btn.getAttribute("data-term");
      pressChip(term);
      render(findEntry(term), term);
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = $("demo-input");
      var q = input.value.trim();
      if (!q) return;
      var entry = findEntry(q);
      pressChip(entry ? entry.terms[0] : "");
      render(entry, extractTerm(q) || q);
    });
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy") ? resolve() : reject(new Error("copy failed"));
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  function initCopy() {
    var buttons = document.querySelectorAll("[data-copy]");
    Array.prototype.forEach.call(buttons, function (btn) {
      var target = $(btn.getAttribute("data-copy"));
      if (!target) return;
      btn.hidden = false;
      btn.setAttribute("aria-label", "Copy " + (btn.closest(".code-card").querySelector("h3").textContent || "code"));
      btn.addEventListener("click", function () {
        var text = btn.getAttribute("data-copy-text") || target.textContent;
        copyText(text).then(
          function () {
            btn.textContent = "Copied";
            btn.setAttribute("data-copied", "true");
            setTimeout(function () {
              btn.textContent = "Copy";
              btn.removeAttribute("data-copied");
            }, 1800);
          },
          function () {
            btn.textContent = "Select & copy";
          }
        );
      });
    });
  }

  function init() {
    initDemo();
    initCopy();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
