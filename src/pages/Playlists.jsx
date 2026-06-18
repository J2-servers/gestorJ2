import React, { useMemo, useState } from "react";
import { ExternalLink, Grid, List as ListIcon, Search, Star, Tv } from "lucide-react";

const players = [
  { category: "Premium", name: "ABE Player", url: "https://abeplayertv.com/login" },
  { category: "Premium", name: "ALL Player", url: "https://alltvplayer.com/login" },
  { category: "Standard", logo: "/playlists/assist_plus.png", name: "Assist Plus +", url: "https://smartcpp.com/#/upload-playlist" },
  { category: "Standard", name: "Bay IPTV", url: "https://cms.bayip.tv/user/manage/playlist" },
  { category: "Popular", featured: true, name: "Bob Player", url: "https://bobplayer.com/device/login" },
  { category: "Premium", featured: true, name: "Bob Premium", url: "https://bobtvpremium.com/device/login" },
  { category: "Premium", name: "Bob Pro", url: "https://bobprotv.com/mylist" },
  { category: "Popular", featured: true, name: "IBO Player", url: "https://iboplayer.com/device/login" },
  { category: "Premium", featured: true, name: "IBO Player Pro", url: "https://iboproapp.com/manage-playlists/login/?callback_url=%2Fmanage-playlists%2Flist" },
  { category: "Popular", featured: true, name: "SSIPTV", url: "https://ss-iptv.com/en/users/playlist" },
];

const categories = ["Todos", "Popular", "Premium", "Standard"];

function PlayerCard({ player, viewMode }) {
  return (
    <article className={`playlists-card ${viewMode === "list" ? "list" : ""}`}>
      {player.featured && (
        <span className="playlists-featured">
          <Star size={13} />
        </span>
      )}
      <div className="playlists-logo">
        {player.logo ? <img alt={player.name} loading="lazy" src={player.logo} /> : <Tv size={28} />}
      </div>
      <div className="playlists-card-main">
        <h3>{player.name}</h3>
        <span>{player.category}</span>
      </div>
      <a href={player.url} rel="noopener noreferrer" target="_blank">
        Abrir
        <ExternalLink size={14} />
      </a>
    </article>
  );
}

export default function Playlists() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [viewMode, setViewMode] = useState("grid");

  const filtered = useMemo(
    () =>
      players.filter((player) => {
        const matchSearch = player.name.toLowerCase().includes(search.toLowerCase());
        const matchCategory = category === "Todos" || player.category === category;
        return matchSearch && matchCategory;
      }),
    [category, search],
  );

  const featured = useMemo(() => filtered.filter((player) => player.featured), [filtered]);
  const others = useMemo(() => filtered.filter((player) => !player.featured), [filtered]);
  const showFeatured = featured.length > 0 && category === "Todos" && !search;

  return (
    <div className="playlists-page">
      <main className="playlists-shell">
        <section className="playlists-hero">
          <div>
            <span>IPTV</span>
            <h1>Players</h1>
            <p>Links rapidos para gerenciar playlists nos principais players usados pelos clientes.</p>
          </div>
          <div className="playlists-view-toggle">
            <button className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")} type="button">
              <Grid size={16} />
            </button>
            <button className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")} type="button">
              <ListIcon size={16} />
            </button>
          </div>
        </section>

        <section className="playlists-toolbar">
          <div className="playlists-search">
            <Search size={17} />
            <input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar player" value={search} />
          </div>
          <div className="playlists-cats">
            {categories.map((item) => (
              <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)} type="button">
                {item}
              </button>
            ))}
          </div>
          <strong>{filtered.length} de {players.length}</strong>
        </section>

        {showFeatured && (
          <section className="playlists-section">
            <div className="playlists-title">
              <Star size={15} />
              <span>Em destaque</span>
            </div>
            <div className={`playlists-grid ${viewMode}`}>
              {featured.map((player) => (
                <PlayerCard key={player.name} player={player} viewMode={viewMode} />
              ))}
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section className="playlists-section">
            <div className="playlists-title">
              <Tv size={15} />
              <span>{showFeatured ? "Todos os players" : "Resultado"}</span>
            </div>
            <div className={`playlists-grid ${viewMode}`}>
              {others.map((player) => (
                <PlayerCard key={player.name} player={player} viewMode={viewMode} />
              ))}
            </div>
          </section>
        )}

        {filtered.length === 0 && (
          <section className="playlists-empty">
            <Search size={28} />
            <strong>Nenhum player encontrado</strong>
            <p>Tente ajustar sua busca ou filtro.</p>
          </section>
        )}
      </main>

      <style>{playlistsStyles}</style>
    </div>
  );
}

const playlistsStyles = `
.playlists-page {
  width: 100%;
  min-height: 100dvh;
  color: var(--j2-text);
  background: linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 54%, #010202 100%);
  overflow-x: hidden;
}

.playlists-shell {
  width: min(1400px, 100%);
  min-height: 100dvh;
  margin: 0 auto;
  padding: clamp(14px, 2vw, 30px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.playlists-hero,
.playlists-toolbar,
.playlists-card,
.playlists-empty {
  border: 0 !important;
  background: rgba(6, 7, 7, .96) !important;
  box-shadow: var(--j2-neu) !important;
}

.playlists-hero {
  border-radius: 28px;
  padding: clamp(18px, 2.2vw, 30px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.playlists-hero span,
.playlists-title span {
  display: block;
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.playlists-hero h1 {
  margin: 4px 0 7px;
  color: var(--j2-text);
  font-size: clamp(38px, 6vw, 68px);
  line-height: .9;
  font-weight: 950;
}

.playlists-hero p {
  max-width: 700px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 14px;
}

.playlists-view-toggle {
  border-radius: 17px;
  padding: 5px;
  display: flex;
  gap: 5px;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.playlists-view-toggle button,
.playlists-cats button {
  border: 0;
  min-height: 38px;
  border-radius: 13px;
  padding: 0 12px;
  color: var(--j2-muted);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
}

.playlists-view-toggle button {
  width: 38px;
  padding: 0;
  display: grid;
  place-items: center;
}

.playlists-view-toggle button.active,
.playlists-cats button.active {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.playlists-toolbar {
  border-radius: 24px;
  padding: 12px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 10px;
  align-items: center;
}

.playlists-search {
  min-height: 46px;
  border-radius: 16px;
  padding: 0 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--j2-faint);
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.playlists-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--j2-text);
  background: transparent;
  font-size: 14px;
}

.playlists-cats {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.playlists-toolbar > strong {
  color: var(--j2-muted);
  font-size: 12px;
  white-space: nowrap;
}

.playlists-section {
  display: grid;
  gap: 10px;
}

.playlists-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--j2-accent);
}

.playlists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.playlists-grid.list {
  grid-template-columns: 1fr;
}

.playlists-card {
  min-width: 0;
  position: relative;
  border-radius: 24px;
  padding: 18px;
  display: grid;
  gap: 13px;
  justify-items: center;
  text-align: center;
}

.playlists-card.list {
  grid-template-columns: 58px minmax(0, 1fr) auto;
  align-items: center;
  justify-items: stretch;
  text-align: left;
}

.playlists-featured {
  position: absolute;
  top: 13px;
  right: 13px;
  color: #f5b942;
}

.playlists-logo {
  width: 78px;
  height: 78px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  color: var(--j2-accent);
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.playlists-card.list .playlists-logo {
  width: 58px;
  height: 58px;
  border-radius: 18px;
}

.playlists-logo img {
  width: 64px;
  height: 64px;
  object-fit: contain;
}

.playlists-card-main {
  min-width: 0;
}

.playlists-card-main h3 {
  margin: 0 0 8px;
  overflow: hidden;
  color: var(--j2-text);
  font-size: 16px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playlists-card-main span {
  display: inline-flex;
  border-radius: 999px;
  padding: 4px 10px;
  color: var(--j2-accent);
  background: rgba(255, 75, 18, .08);
  font-size: 11px;
  font-weight: 900;
}

.playlists-card a {
  min-height: 40px;
  width: 100%;
  border-radius: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  box-shadow: var(--j2-neu-soft);
  text-decoration: none;
  font-size: 12px;
  font-weight: 950;
}

.playlists-card.list a {
  width: auto;
  padding: 0 14px;
}

.playlists-empty {
  min-height: 280px;
  border-radius: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  padding: 24px;
  text-align: center;
}

.playlists-empty svg {
  color: var(--j2-accent);
}

.playlists-empty strong {
  color: var(--j2-text);
  font-size: 18px;
  font-weight: 950;
}

.playlists-empty p {
  margin: 0;
  color: var(--j2-muted);
  font-size: 13px;
}

@media (max-width: 900px) {
  .playlists-toolbar {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .playlists-shell {
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
  }

  .playlists-hero {
    align-items: stretch;
    flex-direction: column;
    border-radius: 24px;
  }

  .playlists-hero h1 {
    font-size: clamp(38px, 12vw, 54px);
  }

  .playlists-view-toggle {
    width: fit-content;
  }

  .playlists-cats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .playlists-card.list {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .playlists-card.list a {
    width: 100%;
  }
}
`;
