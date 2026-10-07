// Vercel serverless function for every /api/* request (see vercel.json rewrites).
// It delegates to the NestJS handler compiled by `nest build` during the
// Vercel build step (petko-be/dist/serverless.js). The Nest app is bootstrapped
// once per warm instance and cached there.
module.exports = require('../petko-be/dist/serverless.js').default
