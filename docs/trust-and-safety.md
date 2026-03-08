# Kula Trust & Safety System

Kula is built on the principle that trust enables generosity. Our trust and safety system is designed to reward genuine community participation, protect members from bad actors, and create a fair environment for sharing.

---

## Trust Score

Every Kula member has a trust score from 0 to 100, calculated from seven weighted signals that together paint a holistic picture of community participation.

### The Seven Signals

| Signal | Weight | Description |
|---|---|---|
| Review Quality | 25% | Your average rating from completed exchanges. Activates after 3 reviews; before that, a neutral baseline is used. |
| Generosity Ratio | 20% | The balance between what you give and what you receive. Members who give more than they take score higher. |
| Exchange Volume | 15% | Total number of completed exchanges. Uses a logarithmic scale so early exchanges count more, preventing score inflation from volume alone. |
| Consistency | 15% | How consistent your ratings are across different exchanges. Reliable members tend to receive steady, predictable reviews. |
| Verification | 10% | Points for identity verification methods (email, phone, ID) and community vouching. |
| Response Rate | 10% | How reliably and promptly you respond to messages from other members. |
| Activity Recency | 5% | Rewards staying active. Full points if active within the last 30 days, with gradual decay between 30-60 days of inactivity. |

### Trust Tiers

Your trust score places you in one of three tiers:

- **Building (0-59)** — New or developing members still establishing their reputation. Full access to core features like posting, exchanging, and messaging.
- **Established (60-84)** — Reliable community members who have demonstrated consistent, trustworthy participation. Unlocks the ability to create new groups.
- **Highly Trusted (85-100)** — Top community contributors. Can vouch for other members to help them get verified.

---

## Anti-Gaming Protections

Trust systems are only as good as their resistance to manipulation. Kula includes several safeguards to keep scores honest.

### Review Cap for New Members
Members with fewer than 5 completed exchanges can only give ratings up to 4 stars. This prevents new or fake accounts from artificially inflating someone's score.

### Reciprocal Review Down-Weighting
When two members review each other on the same exchange, those reviews are weighted at 50%. This discourages "you scratch my back, I'll scratch yours" rating inflation.

### Pending Review Gate
Members must leave reviews on their completed exchanges before posting new items. If you have 3 or more exchanges awaiting your review, you'll be prompted to write those reviews before you can create a new post.

### Daily Score Cap
Trust scores can only change by +/- 5 points in a single day. This prevents sudden manipulation spikes and ensures trust is built (or lost) gradually.

---

## Time-Dollar Safeguards

Time-dollars (TD) are Kula's unit of exchange for valuing time-based services. One TD represents one hour of work. The system includes guardrails to keep the economy healthy.

- **Floor: -3 TD** — No member can go below -3 TD, preventing runaway debt.
- **Cap: 100 TD** — No member can accumulate more than 100 TD, preventing hoarding.
- **Minimum increment: 0.25 TD** — Exchanges are measured in 15-minute blocks (0.25 TD minimum).
- **Starter bonus: 5 TD** — New members receive 5 TD upon completing onboarding, giving everyone the ability to participate immediately.

---

## Loan Safety

When members lend physical items to each other, Kula provides a structured lifecycle to protect both parties.

### Automated Reminders
- **2 days before due**: Both the lender and borrower receive a reminder notification.
- **Day of**: Return date notification.
- **1 day overdue**: Overdue notification sent to both parties.

### Late Flags
Items that are 3 or more days overdue are automatically flagged as late. Both parties are notified, and the lender can escalate the situation to a community moderator.

### Condition Documentation
Lenders can upload before and after photos of their items to document condition at the time of lending and return. This provides evidence in case of disputes.

---

## Dispute Resolution

If an exchange goes wrong, either party can file a formal dispute.

### How It Works
1. **Filing**: Either the provider or receiver can file a dispute by describing the issue (20-1,000 characters).
2. **Notification**: The other party is immediately notified, and community moderators are alerted.
3. **Review**: Moderators can see the dispute details, the exchange history, and both parties' accounts.
4. **Resolution**: Moderators resolve the dispute in favor of one party or cancel the exchange, with written resolution notes.
5. **Notification**: Both parties are notified of the outcome.

---

## Verification Tiers

Kula uses a tiered verification system to help members build additional trust.

### Basic
Default tier for all members. Requires a verified email address to sign up.

### Verified
Members who complete additional identity verification (such as uploading a government-issued ID for moderator review) are upgraded to Verified status.

### Community Vouched
Members can be vouched for by Highly Trusted community members (trust score 80+). When a member receives 3 vouches from Highly Trusted members, they are automatically upgraded to Community Vouched status. This peer-driven verification reflects real-world trust relationships.

---

## Community Moderation

Each Kula group has community moderators who maintain a safe and respectful environment.

### Moderator Capabilities
- **Flag queue**: Review and resolve content flags submitted by members.
- **Content removal**: Remove posts, discussion threads, replies, or comments that violate community standards.
- **Warnings**: Issue formal warnings to members.
- **Bans**: Temporarily or permanently ban members from a community.
- **Dispute resolution**: Review and resolve exchange disputes.
- **Pin threads**: Highlight important discussions.

### Moderation Safeguards
- **Ban hierarchy**: Moderators cannot ban administrators, and lower-role members cannot take action against higher-role members.
- **Flag rate limiting**: Members are limited to 10 flags per hour to prevent abuse of the reporting system.
- **Duplicate flag prevention**: A member can only flag the same piece of content once.
- **Race condition guards**: Concurrent moderator actions on the same flag are prevented to avoid double-actioning.

---

## Trust-Gated Features

Certain features require a minimum trust score to access, ensuring they are used responsibly by established community members.

| Feature | Required Trust Score |
|---|---|
| Create a new group | 60 (Established) |
| Vouch for other members | 80 (Highly Trusted) |

---

## Design Principles

Kula's trust and safety system is guided by these principles:

1. **Trust is earned gradually** — No shortcuts. Daily score caps and logarithmic scaling ensure trust builds over time through genuine participation.
2. **Gaming is expensive** — Multiple anti-gaming measures make manipulation difficult and unrewarding.
3. **Transparency** — Members can see exactly how their trust score is calculated and what they can do to improve it.
4. **Community-driven** — Vouching and moderation put trust decisions in the hands of the community itself.
5. **Proportional consequences** — Safeguards are calibrated to prevent harm without being punitive to honest members.
