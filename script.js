// Flaggen Symbole
const flagUrls = {
  en: "https://flagcdn.com/gb.svg",
  de: "https://flagcdn.com/de.svg",
  jp: "https://flagcdn.com/jp.svg"
};

let allCards = [];
let filterMode = "all";
let currentPokemon = "lapras";
let currentUserId = null;

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const userInfo = document.getElementById("user-info");

  // Login mit Google
  if (loginBtn) {
    loginBtn.onclick = () => {
      window.firebase.signInWithPopup(window.firebase.auth, window.firebase.provider)
        .catch(console.error);
    };
  }

  // Logout-Funktion
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      window.firebase.auth.signOut();
    };
  }

  // Auth-Zustand überwachen
  window.firebase.onAuthStateChanged(window.firebase.auth, async user => {
    if (user) {
      currentUserId = user.uid;
      userInfo.textContent = `Eingeloggt als: ${user.displayName}`;
      logoutBtn.style.display = "inline-block";
      loginBtn.style.display = "none";
      await loadCollection(currentUserId); // lädt gespeicherte Sammlung
    } else {
      currentUserId = null;
      userInfo.textContent = "Nicht eingeloggt";
      logoutBtn.style.display = "none";
      loginBtn.style.display = "inline-block";
      fetchCards(currentPokemon); // lädt Karten ohne gespeicherte Daten
    }
  });
});

// Holt Karten-Daten vom Pokémon TCG API
async function fetchCards(pokemonName) {
const res = await fetch(`https://poki-api-proxy.luhter12345.workers.dev?pokemon=${pokemonName}`);
  const data = await res.json();
  allCards = data.data;

  allCards.sort((a, b) => new Date(a.set.releaseDate) - new Date(b.set.releaseDate));
  renderCards(allCards);
}

// Zeigt Karten im DOM an
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
        if (currentUserId) saveCollection(currentUserId); // sofort speichern
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

    wrapper.appendChild(checkmark);
    wrapper.appendChild(img);
    wrapper.appendChild(section);

    img.onclick = () => {
      const owned = localStorage.getItem(card.id) === "true";
      localStorage.setItem(card.id, !owned);
      renderCards(allCards);
      if (currentUserId) saveCollection(currentUserId);
    };

    container.appendChild(wrapper);
  });
}

// Pokémon- und Filterauswahl
window.onload = () => {
  const selector = document.getElementById("pokemon-select");
  const searchField = document.getElementById("pokemon-search");

  if (selector) {
    currentPokemon = selector.value;
    fetchCards(currentPokemon);
  } else if (searchField) {
    // Wenn Suchfeld existiert, lade NICHT automatisch ein Pokémon (erst bei Benutzereingabe)
    console.log("Warte auf Nutzereingabe für Autocomplete...");
  } else {
    console.warn("Kein Pokémon-Startwert gefunden.");
  }
};


  selector.onchange = () => {
    currentPokemon = selector.value;
    fetchCards(currentPokemon);
  };

  document.getElementById("filter-select").onchange = (e) => {
    filterMode = e.target.value;
    renderCards(allCards);
  };

// Speichert Besitz- und Sprachdaten in Firestore
async function saveCollection(userId) {
  const owned = {};
  const languages = {};

  allCards.forEach(card => {
    owned[card.id] = localStorage.getItem(card.id) === "true";

    ["en", "de", "jp"].forEach(lang => {
      const key = `${card.id}_${lang}_count`;
      languages[key] = parseInt(localStorage.getItem(key)) || 0;
    });
  });

  await window.firebase.setDoc(window.firebase.doc(window.firebase.db, "collections", userId), {
    owned,
    languages
  });
}

// Lädt Besitz- und Sprachdaten aus Firestore
async function loadCollection(userId) {
  const snap = await window.firebase.getDoc(window.firebase.doc(window.firebase.db, "collections", userId));
  if (snap.exists()) {
    const data = snap.data();

    for (let id in data.owned) {
      localStorage.setItem(id, data.owned[id]);
    }

    for (let key in data.languages) {
      localStorage.setItem(key, data.languages[key]);
    }
  }

  fetchCards(currentPokemon);
}
// ... DEIN BESTEHENDER CODE ...

// 🆕 AUTOCOMPLETE-FUNKTION (OHNE DOMContentLoaded!)
const searchInput = document.getElementById('pokemon-search');
const autocompleteList = document.getElementById('autocomplete-list');

let allPokemonNames = [];

async function loadPokemonNames() {
  let page = 1;
  const pageSize = 250;
  const nameSet = new Set();

  while (true) {
    const response = await fetch(`https://api.pokemontcg.io/v2/cards?page=${page}&pageSize=${pageSize}`);
    const data = await response.json();
    const names = data.data.map(card => card.name);

    names.forEach(name => nameSet.add(name));
    if (data.data.length < pageSize) break;
    page++;
  }

  allPokemonNames = Array.from(nameSet).sort();
}

loadPokemonNames();

searchInput.addEventListener('input', () => {
  const value = searchInput.value.toLowerCase();
  autocompleteList.innerHTML = '';

  if (!value) return;

  const suggestions = allPokemonNames
    .filter(name => name.toLowerCase().startsWith(value))
    .slice(0, 10);

  suggestions.forEach(suggestion => {
    const item = document.createElement('li');
    item.textContent = suggestion;
    item.classList.add('autocomplete-item');
    item.addEventListener('click', () => {
      searchInput.value = suggestion;
      autocompleteList.innerHTML = '';
      loadPokemonCards(suggestion); // vorhandene Funktion
    });
    autocompleteList.appendChild(item);
  });
});

document.addEventListener('click', (e) => {
  if (!autocompleteList.contains(e.target) && e.target !== searchInput) {
    autocompleteList.innerHTML = '';
  }
});
