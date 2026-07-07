/* ============================================================
   core/characters.js
   Static registry of the 10 baked-in characters (5 perempuan,
   5 laki-laki, seumuran user). Names/gender/avatar/job here are
   FIXED story data — not user-editable (unlike the old single
   generic "partner" slot). See RANCANGAN_MULTI_KARAKTER.md for
   the full design rationale.

   This file only holds STATIC definitions. Per-character RUNTIME
   state (current stat numbers, which identity fields have been
   revealed/unlocked, story progress) lives in AppState.characters,
   built fresh from this registry by core/state.js's defaultData().

   Rival mapping: used by the "rivalRipple" story effect (focus on
   one character nudges her/his rivals' jealousy more than the
   ambient "globalRipple" does). Default policy — same-gender
   characters who canonically know each other — is everyone of the
   same gender, unless a character lists an explicit `rivals` array
   here to override that default (e.g. to exclude/include specific
   people once their relationships are written).
   ============================================================ */

const CHARACTERS = {
  char_nadia:  { name: 'Nadia',  gender: 'f', avatar: 'N', job: { id: 'barista',   title: 'Barista' } },
  char_kirana: { name: 'Kirana', gender: 'f', avatar: 'K', job: { id: 'desainer',  title: 'Desainer Grafis' } },
  char_salsa:  { name: 'Salsa',  gender: 'f', avatar: 'S', job: { id: 'mahasiswa', title: 'Mahasiswa' } },
  char_bella:  { name: 'Bella',  gender: 'f', avatar: 'B', job: { id: 'penyiar',   title: 'Penyiar Radio' } },
  char_intan:  { name: 'Intan',  gender: 'f', avatar: 'I', job: { id: 'apoteker',  title: 'Apoteker' } },

  char_bagas:  { name: 'Bagas',  gender: 'm', avatar: 'B', job: { id: 'montir',    title: 'Montir' } },
  char_raka:   { name: 'Raka',   gender: 'm', avatar: 'R', job: { id: 'fotografer',title: 'Fotografer' } },
  char_fahri:  { name: 'Fahri',  gender: 'm', avatar: 'F', job: { id: 'guru',      title: 'Guru' } },
  char_dimas:  { name: 'Dimas',  gender: 'm', avatar: 'D', job: { id: 'barista',   title: 'Barista' } }, // sengaja sama profesi dgn Nadia — buat contoh "overlap profesi" (lihat §4 rancangan)
  char_aldo:   { name: 'Aldo',   gender: 'm', avatar: 'A', job: { id: 'musisi',    title: 'Musisi Indie' } }
};

// Resolve rivals for a character: explicit `rivals` array on the
// registry entry wins; otherwise default to every other character
// of the same gender.
function getRivals(id) {
  const def = CHARACTERS[id];
  if (!def) return [];
  if (Array.isArray(def.rivals)) return def.rivals;
  return Object.keys(CHARACTERS).filter(k => k !== id && CHARACTERS[k].gender === def.gender);
}

function allCharacterIds() {
  return Object.keys(CHARACTERS);
}
