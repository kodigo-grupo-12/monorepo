// Config de Expo de Cuéntame.
//
// Por defecto devuelve app.json tal cual: el desarrollo local no cambia nada.
// Solo cuando el build de la demo trae PAGES_DEPLOY=1 (GitHub Pages) cambia la
// web: bundle de una sola página (Pages no corre servidores Node) y baseUrl con
// el subpath del repo, que llega en PAGES_BASE_URL.
const base = require("./app.json");

module.exports = process.env.PAGES_DEPLOY
  ? {
      ...base,
      expo: {
        ...base.expo,
        web: { ...base.expo.web, output: "single" },
        experiments: {
          ...base.expo.experiments,
          baseUrl: process.env.PAGES_BASE_URL,
        },
      },
    }
  : base;
