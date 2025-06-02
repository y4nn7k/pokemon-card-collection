// --- Flaggen-URLs für Sprachzähler ---
const flagUrls = {
  en: "https://flagcdn.com/gb.svg",
  de: "https://flagcdn.com/de.svg",
  jp: "https://flagcdn.com/jp.svg"
};

let allCards = [];
let filterMode = "all";
let currentPokemon = "lapras";
let currentUserId = null;

const { getDoc, setDoc, doc } = window.firestoreTools;

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("login-btn");
  const userInfo = document.getElementById("user-info");

  if (loginBtn) {
    loginBtn.onclick = () => {
      window.firebase.signInWithPopup(window.firebase.auth, window.firebase.provider).catch(error => {
        if (error.code !== 'auth/popup-closed-by-user') {
          console.error("Login-Fehler:", error);
        }
      });
    };
  }

  window.firebase.onAuthStateChanged(window.firebase.auth, async user => {
    if (user) {
      currentUserId = user.uid;
      if (userInfo) userInfo.textContent = `Eingeloggt als: ${user.displayName}`;
      await loadCollection(currentUserId);
    } else {
      currentUserId = null;
      if (userInfo) userInfo.textContent = "Nicht eingeloggt";
      fetchCards(currentPokemon);
    }
  });
});

async function fetchCards(pokemonName) {
  const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:${pokemonName}`, {
    headers: { "X-Api-Key": "DEIN_API_KEY_HIER" }
  });
  const data = await res.json();
  allCards = data.data;
  allCards.sort((a, b) => new Date(a.set.releaseDate) - new Date(b.set.releaseDate));
  renderCards(allCards);
}

function renderCards(cards) {
  const container = document.getElementById("card-list");
  container.innerHTML = "";

  cards.forEach(card => {
    const isOwned = localStorage.getItem(card.id) === "true";
    const shouldShow =
      filterMode === "all" ||
      (filterMode === "owned" && isOwned) ||
      (filterMode === "not-owned" && !isOwned);

    if (!shouldShow) return;

    const wrapper = document.createElement("div");
    wrapper.className = "card-wrapper";
    if (isOwned && filterMode !== "owned") wrapper.classList.add("owned");

    const img = document.createElement("img");
    img.src = card.images.large;
    img.alt = card.name;
    img.className = "card-image";

    const checkmark = document.createElement("div");
    checkmark.className = "checkmark";
    checkmark.textContent = "✔";
    if (isOwned) checkmark.classList.add("visible");

    const buttons = document.createElement("div");
    buttons.className = "language-buttons";

    ["en", "de", "jp"].forEach(lang => {
      const btnWrapper = document.createElement("div");
      btnWrapper.className = "flag-wrapper";

      const btn = document.createElement("button");
      btn.className = "flag-button";
      btn.style.backgroundImage = `url(${flagUrls[lang]})`;

      const countKey = `${card.id}_${lang}_count`;
      let count = parseInt(localStorage.getItem(countKey)) || 0;

      const counter = document.createElement("div");
      counter.className = "flag-counter";
      counter.textContent = count;

      btn.onclick = (e) => {
        e.stopPropagation();
        count++;
        counter.textContent = count;
        localStorage.setItem(countKey, count);
        if (currentUserId) saveCollection(currentUserId); // neu: auch Sprachmenge speichern
      };

      btn.oncontextmenu = (e) => {
        e.preventDefault();
        if (count > 0) count--;
        counter.textContent = count;
        localStorage.setItem(countKey, count);
        if (currentUserId) saveCollection(currentUserId);
      };

      btnWrapper.appendChild(btn);
      btnWrapper.appendChild(counter);
      buttons.appendChild(btnWrapper);
    });

    const setText = document.createElement("div");
    setText.className = "card-set";
    setText.textContent = `Set: ${card.set.name}`;

    const cmLink = document.createElement("a");
    const url = card.cardmarket?.url;
    cmLink.href = url || `https://www.cardmarket.com/en/Pokemon/Search?searchString=${encodeURIComponent(card.name)}`;
    cmLink.target = "_blank";
    cmLink.className = "cardmarket-link";
    cmLink.textContent = "Cardmarket";

    const section = document.createElement("div");
    section.className = "card-section";
    section.appendChild(buttons);
    section.appendChild(setText);
    section.appendChild(cmLink);

    img.onclick = () => {
      const owned = localStorage.getItem(card.id) === "true";
      localStorage.setItem(card.id, !owned);
      renderCards(allCards);
      if (currentUserId) saveCollection(currentUserId);
    };

    wrapper.appendChild(checkmark);
    wrapper.appendChild(img);
    wrapper.appendChild(section);
    container.appendChild(wrapper);
  });
}

window.onload = () => {
  const selector = document.getElementById("pokemon-select");
  currentPokemon = selector.value;
  fetchCards(currentPokemon);

  selector.onchange = () => {
    currentPokemon = selector.value;
    fetchCards(currentPokemon);
  };

  document.getElementById("filter-select").onchange = (e) => {
    filterMode = e.target.value;
    renderCards(allCards);
  };
};

// --- Sammlung in Firestore speichern: Besitz + Sprachmengen ---
async function saveCollection(userId) {
  const owned = {};
  const counts = {};

  allCards.forEach(card => {
    owned[card.id] = localStorage.getItem(card.id) === "true";

    ["en", "de", "jp"].forEach(lang => {
      const countKey = `${card.id}_${lang}_count`;
      const count = parseInt(localStorage.getItem(countKey)) || 0;
      if (!counts[card.id]) counts[card.id] = {};
      counts[card.id][lang] = count;
    });
  });

  await setDoc(doc(window.db, "collections", userId), {
    owned,
    counts
  });
}

// --- Sammlung aus Firestore laden: Besitz + Sprachmengen ---
async function loadCollection(userId) {
  const snap = await getDoc(doc(window.db, "collections", userId));
  if (snap.exists()) {
    const data = snap.data();

    const owned = data.owned || {};
    const counts = data.counts || {};

    for (let id in owned) {
      localStorage.setItem(id, owned[id]);
    }

    for (let id in counts) {
      for (let lang in counts[id]) {
        localStorage.setItem(`${id}_${lang}_count`, counts[id][lang]);
      }
    }
  }

  fetchCards(currentPokemon);
}
