# 0001: Verified product reviews behind the application API

Status: accepted, 2026-11-14.

## Context

Guest storefront visitors need public review reading while account, cart, checkout, order, and moderation writes remain private. Orders already distinguish reported delivery from customer-confirmed receipt, and every variation has its own purchased product ID. Account deletion explicitly removes the user's identifying content while preserving anonymized order history.

## Decision

Use a backend-only reviews table and service-role-only transactional functions, exposed through validated Nest controllers/services/repositories. Purchase eligibility requires owner-confirmed receipt. Enforce a unique customer/product slot; repeat purchases can update but cannot multiply its rating weight. Display sibling reviews together using the existing exact parent-name grouping and purchased variation label.

Reviews publish immediately. Admins can hide/unhide but cannot edit ratings or text. Owner removal withdraws a slot so later reposts cannot reset admin moderation; account deletion cascades the row. Only visible, nonwithdrawn rows affect public lists and aggregates. Author names are derived into a limited display label at read time; never store public author snapshots or expose purchase/account identifiers.

Keep public reads independent of authentication and private owner context/mutations authenticated. Guest browsing creates no anonymous cart and never automatically repeats a purchase action after login.

## Consequences

The database enforces ownership, eligibility, uniqueness, and moderation across devices and concurrent requests. Public data is explicitly projected rather than exposing broad profile/table grants. A withdrawal tombstone is retained until account deletion; UI copy must describe removal from public reviews without promising immediate physical erasure. Family grouping follows the existing mutable catalog parent name rather than adding an unrelated family-identity migration. See `docs/plans/2026-11-14-guest-browsing-product-reviews.md` for exact contracts, verification, and rollout.
