const flagUrls = {
  en: "https://flagcdn.com/gb.svg",
  de: "https://flagcdn.com/de.svg",
  jp: "https://flagcdn.com/jp.svg"
};

let allCards = [];
let filterMode = "all";
let currentPokemon = "lapras";

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
    if (isOwned && filterMode !== "owned") {
  wrapper.classList.add("owned");
} else {
  wrapper.classList.remove("owned");
}


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

    const languageCounts = JSON.parse(localStorage.getItem(`langCounts_${card.id}`) || '{}');

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
      };

      btn.oncontextmenu = (e) => {
        e.preventDefault();
        if (count > 0) count--;
        counter.textContent = count;
        localStorage.setItem(countKey, count);
      };

      btnWrapper.appendChild(btn);
      btnWrapper.appendChild(counter);
      buttons.appendChild(btnWrapper);
    });

    const setText = document.createElement("div");
    setText.className = "card-set";
    setText.textContent = `Set: ${card.set.name}`;

    const cmLink = document.createElement("a");
    const setUrl = card.set.name.replace(/ /g, "-");
    cmLink.href = `https://www.cardmarket.com/en/Pokemon/Products/Singles/${setUrl}?searchString=${encodeURIComponent(card.name)}&idRarity=0&perSite=20`;
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
};

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
