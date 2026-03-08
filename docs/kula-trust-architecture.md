# Kula Trust Rating System — Technical Architecture

## Core Design Philosophy

The system treats trust not as a single score but as a **composite signal** derived from multiple independent layers, each resistant to different forms of manipulation. No single rating event can meaningfully distort a user's reputation. The architecture assumes adversarial conditions — that some users *will* attempt to game the system — while preserving the relational, gift-economy ethos of the platform.

---

## Layer 1: Bayesian Reputation Engine

### How It Works

Every user begins with a **prior** — the platform-wide average trust score (e.g., 4.2 out of 5). Individual ratings shift the user's score, but the magnitude of each shift depends on how many interactions they've completed.

### The Math (simplified)

```
adjusted_score = (prior_mean × prior_weight + sum_of_ratings) / (prior_weight + num_ratings)
```

- `prior_weight` acts like a number of "phantom ratings" at the platform average
- Set `prior_weight` to something like 5–8, meaning a new user needs ~10 real interactions before their score diverges meaningfully from the baseline
- This alone eliminates most single-review manipulation

### Tuning Parameters

| Parameter | Suggested Default | Purpose |
|---|---|---|
| `prior_mean` | Platform-wide rolling average | Anchors new users to community norm |
| `prior_weight` | 6 | How many real ratings needed to overcome the prior |
| `recency_halflife` | 90 days | Older ratings decay in influence |
| `min_display_threshold` | 3 interactions | Don't show a public score until this threshold |

---

## Layer 2: Reviewer Credibility Weighting

### The Problem

A raw average treats all raters equally. But a rating from someone with 80 successful exchanges should count more than one from a brand-new account — and a rating from someone who *only* rates their friends should count less than one from someone with a diverse interaction history.

### Credibility Score Components

Each reviewer gets an internal (non-public) **credibility coefficient** between 0.1 and 1.0, derived from:

1. **Tenure & activity volume** — How long active, how many exchanges completed
2. **Rating consistency** — How closely their ratings track consensus. Someone who gives 5 stars to everyone has low signal. Someone whose ratings consistently predict how others will also rate that person has high signal.
3. **Network diversity** — Ratings distributed across many unconnected users score higher than ratings concentrated among a tight cluster
4. **Own reputation** — Users with higher trust scores are slightly more credible raters
5. **Completion rate** — Users who follow through on exchanges are more credible than those who flake

### Weighted Rating Calculation

```
effective_rating = raw_rating × reviewer_credibility_coefficient
```

The Bayesian engine in Layer 1 uses these weighted ratings rather than raw ones.

---

## Layer 3: Anomaly Detection & Anti-Gaming

### 3a. Statistical Outlier Flagging

When a new rating arrives, the system checks:

- **Deviation from expected:** If a user has a stable 4.3 average across 40 interactions, and someone suddenly gives them a 1.0, the system flags it for review rather than incorporating it at full weight. The threshold can be dynamic (e.g., flag anything >2 standard deviations from the user's running mean).
- **Reviewer behavior pattern:** If the reviewer has a history of giving extreme ratings (lots of 1s and 5s, few 3s), their outlier ratings are dampened further.
- **Temporal clustering:** Multiple low (or high) ratings arriving in a short window from previously unconnected accounts triggers a fraud flag.

### 3b. Graph-Based Collusion Detection

This is where the AI matching engine becomes a trust asset. The system maintains a **social graph** of all exchanges and ratings:

```
Nodes = Users
Edges = Completed exchanges + ratings given
```

**Detection patterns:**

| Pattern | Signal | Response |
|---|---|---|
| **Clique inflation** — Small group exclusively rates each other highly | Suspiciously dense subgraph with uniformly high internal ratings | Downweight intra-clique ratings; flag for review |
| **Sock puppets** — Multiple accounts controlled by one person | Similar behavioral fingerprints, overlapping metadata, sequential registration | Merge or suspend accounts |
| **Rating rings** — Coordinated groups who inflate each other | Graph community detection finds isolated clusters with anomalous rating patterns | Progressive dampening of within-cluster ratings |
| **Revenge networks** — Coordinated downrating of a target | Multiple negative ratings from connected accounts in short timeframe | Quarantine ratings; notify moderation |

**Tools:** Community detection algorithms (Louvain, Label Propagation), temporal motif analysis, and simple heuristics (e.g., "if >60% of a user's 5-star ratings come from accounts that also rate each other, flag").

### 3c. Text Analysis (Optional Enhancement)

If ratings include written feedback, NLP can flag:
- **Copy-paste reviews** across different users (suggests coordination)
- **Sentiment mismatch** — glowing text with a 2-star rating, or hostile text with a 5-star (suggests error or manipulation)
- **Boilerplate positivity** — Generic praise with no specific detail (lower signal value)

---

## Layer 4: Mutual Blind Rating Protocol

### The Airbnb Model, Adapted

After an exchange completes:

1. Both parties receive a rating prompt
2. **Neither party can see the other's rating until both have submitted** — or until a 7-day deadline expires
3. If only one party rates, the other's window closes and the single rating stands (but is slightly dampened due to being unilateral)
4. If neither rates within 7 days, the exchange is recorded as completed with no rating (still contributes to volume/tenure metrics)

### Why This Matters for Kula

In a non-monetary community, social pressure around ratings is *more* intense than on Amazon. People know each other. The blind protocol protects honesty while maintaining the relational fabric.

### Additional Nudges

- **Structured prompts over open scores:** Instead of "rate 1–5," use specific questions: "Did they follow through as agreed?" / "Was communication clear and timely?" / "Would you exchange with them again?" This produces more honest, granular data and is harder to game.
- **Delayed score visibility:** A user's overall score updates only after a batch of new ratings (e.g., every 5 new ratings or every 30 days), not in real time. This makes it impossible to correlate a specific interaction with a score change, further reducing retaliation anxiety.

---

## Layer 5: Multi-Dimensional Trust Profile

Rather than a single number, each user has a **trust profile** with independent dimensions:

| Dimension | What It Measures |
|---|---|
| **Reliability** | Do they show up? Do they follow through? |
| **Communication** | Are they responsive, clear, respectful? |
| **Accuracy** | Does what they offer match what they described? |
| **Generosity** | Do they go beyond the minimum? (Kula-specific) |
| **Community** | Do they contribute to the broader platform ecosystem? |

### Benefits for Anti-Gaming

- A spite rating might tank one dimension, but if the other four remain strong, the system (and other users) can see the anomaly
- Inflation schemes tend to inflate *all* dimensions uniformly, which is itself a detectable pattern (real humans have uneven profiles)
- Users browsing trust profiles get richer information than a single number

---

## Layer 6: Vouching & Stake-Weighted Endorsement

### The Social Layer

Established users (those above a trust threshold with sufficient history) can **vouch** for newer users. A vouch is distinct from a rating — it's a forward-looking endorsement, not a review of a past transaction.

### The Mechanism

- A voucher stakes a small portion of their own reputation score on the new user
- If the vouched-for user performs well, the voucher's reputation gets a small boost
- If the vouched-for user behaves badly (consistently poor ratings, flags), the voucher takes a small reputation hit
- Each user can have a limited number of active vouches (e.g., 3–5), preventing indiscriminate endorsement

### Why This Works for Kula

This creates organic mentorship and accountability structures that mirror how trust actually works in gift economies and intentional communities — someone with social capital puts it on the line for a newcomer, creating a web of mutual obligation.

---

## Layer 7: Exchange-Type Segmentation (Unified Score, Segmented Data)

### The Design Principle

Kula supports multiple exchange mechanisms — barter, gift, time-dollar — each with distinct social dynamics and trust expectations. The system tracks ratings **tagged by exchange type** internally, but surfaces a **single unified trust profile** to users.

### Why Not Separate Scores?

Separate per-mechanism scores create several problems: they fragment the data (reducing statistical robustness, especially early on), clutter the interface, and make users with limited history in one category look untrustworthy there even if they're stellar elsewhere. A unified score keeps things legible and socially coherent.

### How It Works

Every rating event is stored with an `exchange_type` tag:

```
rating_record = {
  rater_id, ratee_id, score_per_dimension,
  exchange_type: "barter" | "gift" | "time_dollar",
  timestamp, ...
}
```

This tag enables three things:

**1. Context-aware matching weight.** When a user is browsing time-dollar exchanges, the matching/ranking algorithm can quietly prioritize trust data from that person's previous time-dollar interactions — not by showing a separate score, but by weighting those ratings more heavily in the relevance calculation. The user sees the same trust profile but the algorithm knows which data points are most predictive for the current context.

**2. Split-pattern detection.** The anomaly detection layer (Layer 3) monitors for divergent behavior across exchange types. If someone averages 4.5 in gifting but 2.8 in barter, the system flags this as a meaningful pattern. Rather than showing two scores, it can surface contextual notes to other users: "Most active in gifting (24 exchanges). 3 barter exchanges." This communicates relevant information without fragmenting the reputation itself.

**3. Mechanism-specific structured prompts.** The blind rating questions (Layer 4) can adapt to the exchange type:

| Exchange Type | Additional Prompt Questions |
|---|---|
| **Barter** | "Did the item/service match the description?" / "Was the exchange fair?" |
| **Gift** | "Was the gift offered with genuine generosity?" / "Was there implicit pressure to reciprocate?" |
| **Time Dollar** | "Did they arrive on time?" / "Did the work match the agreed scope and hours?" |

These type-specific prompts generate richer data while still feeding into the same five trust dimensions (Reliability, Communication, Accuracy, Generosity, Community).

### Future-Proofing

If the platform scales and usage data reveals that exchange types really do produce systematically divergent trust patterns — enough to warrant separate visibility — the underlying data is already segmented. You can surface per-mechanism views later without rebuilding the system. But launching unified keeps the community feeling like one ecosystem rather than three siloed marketplaces.

### Edge Case: Cross-Mechanism Trust Transfer

A new user who completes 15 time-dollar exchanges and then tries their first barter shouldn't appear as a complete unknown in the barter context. The system applies a **cross-mechanism transfer rate** — their time-dollar trust carries over to barter at a discounted rate (e.g., 70% weight), reflecting that reliability in one context is a reasonable but imperfect predictor of reliability in another. This discount rate can be tuned as real data accumulates.

---

## System Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                   RATING EVENT                        │
│           (both parties submit blind ratings)         │
│           Tagged: barter | gift | time_dollar         │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│            ANOMALY DETECTION GATE                     │
│  • Statistical outlier check                          │
│  • Reviewer credibility lookup                        │
│  • Graph-based collusion scan                         │
│  • Text analysis (if feedback present)                │
│                                                       │
│  Output: pass / flag / quarantine                     │
└──────────────┬───────────────────────────────────────┘
               │
        ┌──────┼──────────┐
        │      │          │
     [pass] [flag]   [quarantine]
        │      │          │
        │      ▼          ▼
        │   Human      Held for
        │   review     investigation
        │      │
        │      ▼
        │   Confirm / adjust / discard
        │      │
        ├──────┘
        │
        ▼
┌──────────────────────────────────────────────────────┐
│         CREDIBILITY-WEIGHTED INCORPORATION            │
│  • Apply reviewer credibility coefficient             │
│  • Apply recency decay to all prior ratings           │
│  • Feed into Bayesian engine per dimension            │
│  • Update user's multi-dimensional trust profile      │
│  • Store with exchange_type tag for segmented queries  │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│             TRUST PROFILE UPDATE                      │
│  • Batched (not real-time) to prevent correlation     │
│  • Voucher scores adjusted if applicable              │
│  • Community-level stats recalculated                 │
│  • Cross-mechanism transfer rates applied             │
│  • Split-pattern detection across exchange types      │
└──────────────────────────────────────────────────────┘
```

---

## Implementation Priority

### Phase 1 — Foundation (Launch)
- Bayesian reputation engine with priors
- Mutual blind rating protocol
- Multi-dimensional rating prompts (structured questions)
- Exchange-type tagging on all rating records
- Mechanism-specific structured prompts (barter/gift/time-dollar)
- Basic outlier flagging (deviation from mean)

### Phase 2 — Intelligence (Post-Launch, ~Month 2–3)
- Reviewer credibility scoring
- Recency weighting / temporal decay
- Vouching system
- Batch score updates
- Context-aware matching weight (prioritize same-mechanism trust data)
- Cross-mechanism trust transfer rates

### Phase 3 — Advanced Detection (Scale Phase)
- Graph-based collusion detection
- Full anomaly detection pipeline
- Split-pattern detection across exchange types
- Text analysis of written feedback
- Automated moderation escalation workflows

---

## Key Design Decisions to Make

1. **Score visibility:** Should users see their exact numerical scores, or only qualitative tiers (e.g., "Trusted," "Established," "New")? Tiers reduce gaming incentive but lower transparency.

2. **Rating granularity:** 1–5 stars vs. thumbs up/down vs. structured questions only? Structured questions produce better data; star ratings are more familiar.

3. **Dispute resolution:** When someone challenges a rating, who decides? Options range from pure algorithmic adjudication to community-based juries to a small moderation team.

4. **Forgiveness mechanics:** Should users be able to update or retract a rating after the blind period? This enables correction of honest mistakes but opens a social pressure vector.

5. **Transparency of the system:** How much of the anti-gaming machinery do you reveal to users? Full transparency builds trust but helps sophisticated gamers. Partial transparency (explaining principles without exposing exact algorithms) is the usual compromise.

6. **Per-mechanism score surfacing:** At what point (if ever) does divergent behavior across exchange types warrant showing users separate scores or explicit warnings? The current architecture defaults to unified — but define the threshold for when split-pattern data becomes user-facing.

---

*Architecture designed for the Kula sharing/exchange platform. Intended as a living document — revisit assumptions as real usage data emerges.*
