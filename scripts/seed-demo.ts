/**
 * Demo Data Seed Script for Kula MVP
 *
 * Run with: npx tsx scripts/seed-demo.ts
 *
 * Creates realistic demo data for investor presentations:
 * - 8 demo users with avatars and varied profiles
 * - 12+ posts across all categories
 * - Completed exchanges with reviews
 * - Discussion threads with replies
 * - Notifications
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gdeypkyaxesvbzizphiz.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkZXlwa3lheGVzdmJ6aXpwaGl6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjM5MjM4NSwiZXhwIjoyMDg3OTY4Mzg1fQ.oMeUW5PKUO4RSn1pEO6J1Ej0QV_VRnoIs75y-0og-QI";
const PILOT_COMMUNITY_ID = "00000000-0000-0000-0000-000000000001";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function avatarUrl(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2D6A4F&color=fff&size=200&bold=true`;
}

// ============================================================
// DEMO USERS
// ============================================================
const DEMO_USERS = [
  {
    email: "sarah.chen@demo.kula.community",
    password: "demo123456",
    display_name: "Sarah Chen",
    bio: "Urban gardener and community builder. I believe in the power of sharing to create stronger neighborhoods. Always happy to share my harvest!",
    primary_location: "Brooklyn, Park Slope",
    skills: ["gardening", "cooking", "community organizing"],
    offers_list: ["fresh produce", "cooking lessons", "garden space"],
    needs_list: ["home repairs", "moving help", "pet sitting"],
  },
  {
    email: "marcus.williams@demo.kula.community",
    password: "demo123456",
    display_name: "Marcus Williams",
    bio: "Handyman and woodworker. 15 years of experience fixing everything from leaky faucets to building custom shelves. Love helping neighbors.",
    primary_location: "Brooklyn, Prospect Heights",
    skills: ["carpentry", "plumbing", "electrical work", "painting"],
    offers_list: ["home repairs", "power tools", "furniture building"],
    needs_list: ["gardening help", "cooking lessons", "yoga classes"],
  },
  {
    email: "priya.patel@demo.kula.community",
    password: "demo123456",
    display_name: "Priya Patel",
    bio: "Yoga instructor and wellness coach. Passionate about making holistic health accessible to everyone in our community.",
    primary_location: "Brooklyn, Fort Greene",
    skills: ["yoga", "meditation", "reiki", "nutrition coaching"],
    offers_list: ["yoga classes", "meditation sessions", "wellness coaching"],
    needs_list: ["web design", "photography", "bicycle repair"],
  },
  {
    email: "david.rodriguez@demo.kula.community",
    password: "demo123456",
    display_name: "David Rodriguez",
    bio: "Freelance photographer and dad of two. Always looking for ways to connect with the community and swap skills.",
    primary_location: "Brooklyn, Gowanus",
    skills: ["photography", "video editing", "graphic design"],
    offers_list: ["family photos", "event photography", "design work"],
    needs_list: ["childcare", "kids clothes", "tutoring"],
  },
  {
    email: "emma.nakamura@demo.kula.community",
    password: "demo123456",
    display_name: "Emma Nakamura",
    bio: "High school teacher and lifelong learner. I tutor math and science, and I'm always up for a good book swap.",
    primary_location: "Brooklyn, Park Slope",
    skills: ["math tutoring", "science", "writing", "test prep"],
    offers_list: ["tutoring", "college prep", "book lending"],
    needs_list: ["massage", "home cooking", "plant care"],
  },
  {
    email: "jamal.thompson@demo.kula.community",
    password: "demo123456",
    display_name: "Jamal Thompson",
    bio: "Professional chef turned food entrepreneur. I share surplus from my test kitchen and love feeding the neighborhood.",
    primary_location: "Brooklyn, Bed-Stuy",
    skills: ["cooking", "baking", "meal prep", "food preservation"],
    offers_list: ["prepared meals", "cooking classes", "catering advice"],
    needs_list: ["graphic design", "social media help", "moving help"],
  },
  {
    email: "lisa.oconnor@demo.kula.community",
    password: "demo123456",
    display_name: "Lisa O'Connor",
    bio: "Retired attorney now spending my time sewing, crafting, and helping neighbors with legal questions. Life's too short not to share.",
    primary_location: "Brooklyn, Carroll Gardens",
    skills: ["sewing", "legal advice", "knitting", "estate planning"],
    offers_list: ["clothing alterations", "legal guidance", "knitted items"],
    needs_list: ["tech support", "rides", "heavy lifting"],
  },
  {
    email: "alex.kim@demo.kula.community",
    password: "demo123456",
    display_name: "Alex Kim",
    bio: "Software engineer by day, cyclist and tinkerer by night. I fix bikes and small electronics for the joy of it.",
    primary_location: "Brooklyn, Williamsburg",
    skills: ["bike repair", "electronics repair", "programming", "3D printing"],
    offers_list: ["bike tune-ups", "electronics repair", "coding lessons"],
    needs_list: ["cooking", "garden space", "furniture"],
  },
];

// ============================================================
// DEMO POSTS
// ============================================================
function createPosts(userIds: string[]) {
  const now = new Date();
  return [
    {
      author_id: userIds[0], // Sarah
      type: "offer" as const,
      category: "food-garden",
      title: "Homegrown Tomatoes & Fresh Herbs — Take What You Need",
      body: "My garden is overflowing! I have cherry tomatoes, heirloom beefsteaks, basil, cilantro, and rosemary to share. Pick up anytime this week from my front stoop. I'll leave a basket out. First come, first served!\n\nHappy to teach basic container gardening too if anyone wants to start their own.",
      exchange_modes: ["gift", "flexible"],
      community_id: PILOT_COMMUNITY_ID,
      status: "active",
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      author_id: userIds[1], // Marcus
      type: "offer" as const,
      category: "tools-equipment",
      title: "Lending Power Tools — Drill, Circular Saw, Sander",
      body: "I have a full set of DeWalt power tools that mostly sit in my garage. Happy to lend them out to anyone who needs them for a project.\n\nTools available:\n- Cordless drill/driver\n- Circular saw\n- Random orbital sander\n- Jigsaw\n- Reciprocating saw\n\nJust take good care of them and return within a week!",
      exchange_modes: ["loan", "flexible"],
      community_id: PILOT_COMMUNITY_ID,
      status: "active",
      created_at: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      author_id: userIds[2], // Priya
      type: "offer" as const,
      category: "wellness-bodywork",
      title: "Free Community Yoga in the Park — Saturdays 9am",
      body: "I'm organizing a free community yoga class every Saturday morning at Prospect Park (Long Meadow, near the 3rd Street entrance).\n\nAll levels welcome! Bring your own mat or towel. I'll guide a gentle 60-minute flow suitable for beginners and experienced practitioners alike.\n\nThis is my way of giving back to the neighborhood that has given me so much.",
      exchange_modes: ["gift"],
      community_id: PILOT_COMMUNITY_ID,
      status: "active",
      created_at: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
    },
    {
      author_id: userIds[3], // David
      type: "offer" as const,
      category: "creative-services",
      title: "Free Family & Pet Portraits — Building My Community Portfolio",
      body: "I'm a professional photographer looking to build my community portfolio. I'd love to do free portrait sessions for families, couples, or pets in the neighborhood.\n\nSessions are 30 minutes and you'll get 10-15 edited digital photos. I can shoot at Prospect Park or another outdoor location.\n\nLet's capture some beautiful memories!",
      exchange_modes: ["gift", "barter"],
      community_id: PILOT_COMMUNITY_ID,
      status: "active",
      created_at: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
    },
    {
      author_id: userIds[4], // Emma
      type: "offer" as const,
      category: "education-skills",
      title: "SAT & Math Tutoring — Free for Community Members",
      body: "I've been teaching high school math for 12 years and I'd love to help students in the neighborhood prep for the SAT or get caught up in math.\n\nI can help with:\n- SAT math prep\n- Algebra 1 & 2\n- Geometry\n- Pre-calculus\n\nI have Saturday afternoons free. Happy to meet at the library or a coffee shop.",
      exchange_modes: ["gift", "time_dollar"],
      community_id: PILOT_COMMUNITY_ID,
      status: "active",
      created_at: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(),
    },
    {
      author_id: userIds[5], // Jamal
      type: "offer" as const,
      category: "food-garden",
      title: "Surplus Meals from My Test Kitchen — Pick Up Today",
      body: "Made way too much food testing recipes again! Today I have:\n\n- Jerk chicken with rice and peas (4 portions)\n- Vegetarian black bean soup (6 portions)\n- Fresh cornbread (1 whole pan)\n\nAll containers are compostable. Just message me and swing by between 4-7pm. No strings attached — I just hate food waste!",
      exchange_modes: ["gift"],
      community_id: PILOT_COMMUNITY_ID,
      status: "active",
      created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
    },
    {
      author_id: userIds[6], // Lisa
      type: "offer" as const,
      category: "household",
      title: "Sharing My Sewing Machine — Happy to Teach!",
      body: "I have a lovely Brother sewing machine that I'd love to share. Whether you need to hem pants, repair a tear, or want to learn to sew from scratch, come on over!\n\nI'm home most afternoons and love the company. I can teach basic sewing in about 2 hours — enough to handle most common repairs.\n\nTea and cookies included!",
      exchange_modes: ["gift", "time_dollar"],
      community_id: PILOT_COMMUNITY_ID,
      status: "active",
      created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      author_id: userIds[7], // Alex
      type: "offer" as const,
      category: "transport",
      title: "Free Bike Tune-Ups This Weekend",
      body: "Spring is here and bikes need love! I'm offering free basic bike tune-ups this Saturday from 10am-2pm in front of my building.\n\nI'll handle:\n- Brake adjustment\n- Gear tuning\n- Chain lubrication\n- Tire inflation\n- Basic safety check\n\nBring your bike by and I'll get it road-ready in 20-30 minutes. I do this for fun!",
      exchange_modes: ["gift", "flexible"],
      community_id: PILOT_COMMUNITY_ID,
      status: "active",
      created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    },
    // REQUESTS
    {
      author_id: userIds[3], // David
      type: "request" as const,
      category: "kids-family",
      title: "Looking for Kids' Clothes — Sizes 4T-5T",
      body: "My twins are growing like weeds and I'm looking for anyone who has kids' clothes they've outgrown (sizes 4T-5T). Boys' and girls' styles both welcome.\n\nHappy to pick up! I also have a bag of 2T-3T clothes to pass along if anyone needs smaller sizes.",
      exchange_modes: ["gift", "barter"],
      community_id: PILOT_COMMUNITY_ID,
      status: "active",
      created_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      author_id: userIds[0], // Sarah
      type: "request" as const,
      category: "household",
      title: "Need Help Moving a Couch This Saturday",
      body: "I found a gorgeous vintage couch on Craigslist free section but I need help getting it up 3 flights of stairs to my apartment. Would love a hand!\n\nShould take about 30 minutes total. I'll provide pizza and cold drinks as thanks. Saturday afternoon anytime works.",
      exchange_modes: ["gift", "time_dollar"],
      community_id: PILOT_COMMUNITY_ID,
      status: "active",
      created_at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      author_id: userIds[2], // Priya
      type: "request" as const,
      category: "creative-services",
      title: "Need a Simple Website for My Yoga Practice",
      body: "I'm looking for someone who can help me set up a simple website for my yoga classes. Nothing fancy — just a landing page with my schedule, about me section, and a contact form.\n\nI can offer yoga classes or wellness coaching in exchange! Open to other arrangements too.",
      exchange_modes: ["barter", "time_dollar"],
      community_id: PILOT_COMMUNITY_ID,
      status: "active",
      created_at: new Date(now.getTime() - 15 * 60 * 60 * 1000).toISOString(),
    },
    {
      author_id: userIds[5], // Jamal
      type: "request" as const,
      category: "professional-services",
      title: "Looking for Help with Food Business Logo & Branding",
      body: "I'm launching a small catering business and need help with branding — specifically a logo, business cards, and maybe a simple menu design.\n\nI'm a professional chef so I can trade home-cooked meals, cooking lessons, or even cater a small event in exchange for design work. Let's talk!",
      exchange_modes: ["barter", "time_dollar", "flexible"],
      community_id: PILOT_COMMUNITY_ID,
      status: "active",
      created_at: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(),
    },
    {
      author_id: userIds[7], // Alex
      type: "request" as const,
      category: "housing-space",
      title: "Anyone Have a Garage or Workshop Space to Share?",
      body: "I'm looking for a garage or workshop space where I can work on bike repairs and small electronics projects a few hours a week. My apartment is too small for a proper workbench.\n\nHappy to help with bike maintenance, electronics repair, or even coding projects in exchange for space access!",
      exchange_modes: ["barter", "time_dollar"],
      community_id: PILOT_COMMUNITY_ID,
      status: "active",
      created_at: new Date(now.getTime() - 28 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

// ============================================================
// DISCUSSION THREADS
// ============================================================
function createThreads(userIds: string[]) {
  return [
    {
      community_id: PILOT_COMMUNITY_ID,
      author_id: userIds[0],
      title: "Welcome to Kula! Introduce Yourself Here",
      body: "Hey everyone! Welcome to the Kula Pilot Community. This is a space for us to share, connect, and build trust with our neighbors.\n\nLet's start by introducing ourselves! Share your name, what neighborhood you're in, and what you're excited to share or learn.\n\nI'll go first — I'm Sarah from Park Slope. I'm an avid gardener and I'm excited to share my harvest and learn home repair skills!",
      pinned: true,
    },
    {
      community_id: PILOT_COMMUNITY_ID,
      author_id: userIds[1],
      title: "Tips for Safe and Easy Lending",
      body: "Since a lot of us are lending tools and equipment, I thought I'd share some tips from my experience:\n\n1. **Take a photo** of the item before lending. Quick reference for condition.\n2. **Set a clear return date** in the exchange terms. A week is usually good.\n3. **Clean/maintain** items before lending. Shows respect.\n4. **Communicate** if you need more time — nobody minds if you ask!\n\nWhat other tips do people have?",
      pinned: false,
    },
    {
      community_id: PILOT_COMMUNITY_ID,
      author_id: userIds[2],
      title: "Community Meetup This Saturday — Who's In?",
      body: "I was thinking it would be great to put faces to names! How about a casual meetup at the coffee shop on 5th Ave this Saturday around 11am?\n\nNo agenda, just coffee and conversation. Bring ideas for things you'd like to see in our sharing community!\n\nRSVP here so I know how many to expect.",
      pinned: false,
    },
  ];
}

function createReplies(threadIds: string[], userIds: string[]) {
  return [
    // Replies to Welcome thread
    { thread_id: threadIds[0], author_id: userIds[1], body: "Hey everyone! Marcus here from Prospect Heights. I'm a handyman and woodworker — happy to help with any home repairs. Looking forward to learning some gardening from Sarah!" },
    { thread_id: threadIds[0], author_id: userIds[2], body: "Hi all! I'm Priya from Fort Greene. I teach yoga and wellness coaching. So excited to be part of a community that values sharing over buying!" },
    { thread_id: threadIds[0], author_id: userIds[3], body: "David from Gowanus checking in! I'm a photographer and dad of twins. Can't wait to capture some community moments and get some help with those growing kids!" },
    { thread_id: threadIds[0], author_id: userIds[5], body: "Jamal here from Bed-Stuy! Professional chef with too much food and not enough mouths. Looking forward to feeding the neighborhood!" },
    { thread_id: threadIds[0], author_id: userIds[7], body: "Alex from Williamsburg. I fix bikes and electronics. This platform is exactly what the neighborhood needs. Let's make sharing the default!" },
    // Replies to Tips thread
    { thread_id: threadIds[1], author_id: userIds[6], body: "Great tips, Marcus! I'd add: include any special care instructions. When I lend my sewing machine, I always show people how to thread it properly first." },
    { thread_id: threadIds[1], author_id: userIds[7], body: "For tools especially — make sure to include all the accessories (charger, drill bits, etc). I keep a checklist taped to each case." },
    { thread_id: threadIds[1], author_id: userIds[0], body: "Love these tips! For garden produce, I always include a little card with storage tips so nothing goes to waste." },
    // Replies to Meetup thread
    { thread_id: threadIds[2], author_id: userIds[1], body: "I'm in! I'll bring some of my woodworking samples too if anyone wants to see the kind of work I do." },
    { thread_id: threadIds[2], author_id: userIds[5], body: "Count me in! I'll bring pastries from my kitchen. Consider it a taste test for my new catering venture!" },
    { thread_id: threadIds[2], author_id: userIds[4], body: "Sounds wonderful! I'll be there. Maybe I can help organize a tutoring schedule for the community too." },
  ];
}

// ============================================================
// MAIN SEED FUNCTION
// ============================================================
async function seed() {
  console.log("Starting demo seed...\n");

  // Step 1: Create demo users
  console.log("1. Creating demo users...");
  const userIds: string[] = [];

  for (const user of DEMO_USERS) {
    // Check if user already exists
    const { data: existingUsers } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", user.email)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      console.log(`   User ${user.display_name} already exists, skipping...`);
      userIds.push(existingUsers[0].id);
      continue;
    }

    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { display_name: user.display_name },
      });

    if (authError) {
      console.error(`   Failed to create ${user.display_name}:`, authError.message);
      continue;
    }

    const userId = authUser.user.id;
    userIds.push(userId);

    // Update profile with rich data
    await supabase
      .from("profiles")
      .update({
        display_name: user.display_name,
        bio: user.bio,
        primary_location: user.primary_location,
        skills: user.skills,
        offers_list: user.offers_list,
        needs_list: user.needs_list,
        avatar_url: avatarUrl(user.display_name),
        onboarding_completed: true,
      })
      .eq("id", userId);

    // Join pilot community
    await supabase.from("community_members").upsert(
      { community_id: PILOT_COMMUNITY_ID, user_id: userId },
      { onConflict: "community_id,user_id" }
    );

    console.log(`   Created ${user.display_name} (${userId})`);
  }

  if (userIds.length < 8) {
    console.error("\nNot enough users created. Aborting.");
    return;
  }

  // Step 2: Create posts
  console.log("\n2. Creating demo posts...");
  const posts = createPosts(userIds);
  const postIds: string[] = [];

  for (const post of posts) {
    const { data, error } = await supabase
      .from("posts")
      .insert(post)
      .select("id")
      .single();

    if (error) {
      console.error(`   Failed to create post "${post.title}":`, error.message);
    } else {
      postIds.push(data.id);
      console.log(`   Created: "${post.title}"`);
    }
  }

  // Step 3: Create completed exchanges with reviews
  console.log("\n3. Creating completed exchanges and reviews...");

  const exchanges = [
    {
      // Marcus helped Sarah move
      post_id: postIds[9], // "Need Help Moving a Couch"
      provider_id: userIds[1], // Marcus provides help
      receiver_id: userIds[0], // Sarah receives help
      exchange_mode: "gift" as const,
      terms: "Help moving a couch up 3 flights. Pizza included!",
      status: "completed" as const,
      provider_confirmed: true,
      receiver_confirmed: true,
      completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      // Alex built a website for Priya
      post_id: postIds[10], // "Need a Simple Website"
      provider_id: userIds[7], // Alex provides web work
      receiver_id: userIds[2], // Priya receives website
      exchange_mode: "barter" as const,
      terms: "Website for 4 yoga sessions",
      status: "completed" as const,
      provider_confirmed: true,
      receiver_confirmed: true,
      completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      // David did photos for Jamal
      post_id: postIds[11], // "Looking for Help with Branding"
      provider_id: userIds[3], // David provides design
      receiver_id: userIds[5], // Jamal receives branding
      exchange_mode: "barter" as const,
      terms: "Logo design + business cards for a catered dinner party (up to 10 people)",
      status: "completed" as const,
      provider_confirmed: true,
      receiver_confirmed: true,
      completed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      // Emma tutored David's kids
      post_id: postIds[4], // "SAT & Math Tutoring"
      provider_id: userIds[4], // Emma provides tutoring
      receiver_id: userIds[3], // David's kids receive
      exchange_mode: "time_dollar" as const,
      terms: "4 sessions of math tutoring for 4 hours of family photography",
      status: "completed" as const,
      provider_confirmed: true,
      receiver_confirmed: true,
      completed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      time_dollar_amount: 4,
    },
    {
      // Marcus lent tools to Alex
      post_id: postIds[1], // "Lending Power Tools"
      provider_id: userIds[1], // Marcus provides tools
      receiver_id: userIds[7], // Alex borrows
      exchange_mode: "loan" as const,
      terms: "Drill and circular saw for bike workshop bench project, return in 5 days",
      status: "completed" as const,
      provider_confirmed: true,
      receiver_confirmed: true,
      completed_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const exchangeIds: string[] = [];

  for (const exchange of exchanges) {
    const { data, error } = await supabase
      .from("exchange_agreements")
      .insert(exchange)
      .select("id")
      .single();

    if (error) {
      console.error(`   Failed to create exchange:`, error.message);
    } else {
      exchangeIds.push(data.id);
      console.log(`   Created exchange: ${exchange.terms?.slice(0, 50)}...`);
    }
  }

  // Create reviews for completed exchanges
  console.log("\n4. Creating reviews...");
  const reviews = [
    // Exchange 0: Marcus helped Sarah move
    {
      exchange_id: exchangeIds[0],
      author_id: userIds[0], // Sarah reviews Marcus
      subject_id: userIds[1],
      rating: 5,
      body: "Marcus was incredible! Showed up on time, was super careful with the couch, and even helped rearrange my living room. True community spirit. Can't recommend him enough!",
    },
    {
      exchange_id: exchangeIds[0],
      author_id: userIds[1], // Marcus reviews Sarah
      subject_id: userIds[0],
      rating: 5,
      body: "Sarah is the best neighbor! The pizza was amazing and she sent me home with fresh basil from her garden. What a wonderful exchange experience.",
    },
    // Exchange 1: Alex built website for Priya
    {
      exchange_id: exchangeIds[1],
      author_id: userIds[2], // Priya reviews Alex
      subject_id: userIds[7],
      rating: 5,
      body: "Alex built me a beautiful, clean website in just a few days. He even added a booking feature I didn't ask for. The barter for yoga sessions was perfect!",
    },
    {
      exchange_id: exchangeIds[1],
      author_id: userIds[7], // Alex reviews Priya
      subject_id: userIds[2],
      rating: 5,
      body: "Priya's yoga sessions were transformative. She really customized the practice to help with my shoulder tension from biking. Fair trade for web work!",
    },
    // Exchange 2: David designed for Jamal
    {
      exchange_id: exchangeIds[2],
      author_id: userIds[5], // Jamal reviews David
      subject_id: userIds[3],
      rating: 5,
      body: "David nailed the branding! The logo perfectly captures the vibe of my cooking. Professional quality work that I would have paid hundreds for. The Kula way works!",
    },
    {
      exchange_id: exchangeIds[2],
      author_id: userIds[3], // David reviews Jamal
      subject_id: userIds[5],
      rating: 5,
      body: "Jamal's catered dinner was a showstopper. My friends are STILL talking about the jerk chicken. Way more than a fair exchange — this man is a culinary genius.",
    },
    // Exchange 3: Emma tutored David's kids
    {
      exchange_id: exchangeIds[3],
      author_id: userIds[3], // David reviews Emma
      subject_id: userIds[4],
      rating: 5,
      body: "Emma is an amazing tutor. My daughter went from struggling with algebra to actually enjoying it. Patient, clear explanations, and really connects with kids.",
    },
    {
      exchange_id: exchangeIds[3],
      author_id: userIds[4], // Emma reviews David
      subject_id: userIds[3],
      rating: 4,
      body: "David took gorgeous family photos for us. Really captured the kids' personalities. He was flexible with scheduling too, which I appreciated.",
    },
    // Exchange 4: Marcus lent tools to Alex
    {
      exchange_id: exchangeIds[4],
      author_id: userIds[7], // Alex reviews Marcus
      subject_id: userIds[1],
      rating: 5,
      body: "Marcus lent me his DeWalt drill and saw — both in perfect condition. He even threw in some extra drill bits. Returned everything clean and on time. Great experience!",
    },
    {
      exchange_id: exchangeIds[4],
      author_id: userIds[1], // Marcus reviews Alex
      subject_id: userIds[7],
      rating: 5,
      body: "Alex took excellent care of my tools and returned them even cleaner than when he borrowed them. Trustworthy guy — happy to lend to him anytime.",
    },
  ];

  for (const review of reviews) {
    const { error } = await supabase.from("reviews").insert(review);
    if (error) {
      console.error(`   Failed to create review:`, error.message);
    } else {
      console.log(`   Created review for exchange ${review.exchange_id?.slice(0, 8)}...`);
    }
  }

  // Direct stats update since exchanges were INSERT'd as completed (trigger only fires on UPDATE)
  console.log("\n5. Updating user stats...");
  const statUpdates: Record<string, { exchanges: number; given: number; received: number }> = {};
  for (const ex of exchanges) {
    if (!statUpdates[ex.provider_id]) statUpdates[ex.provider_id] = { exchanges: 0, given: 0, received: 0 };
    if (!statUpdates[ex.receiver_id]) statUpdates[ex.receiver_id] = { exchanges: 0, given: 0, received: 0 };
    statUpdates[ex.provider_id].exchanges++;
    statUpdates[ex.provider_id].given++;
    statUpdates[ex.receiver_id].exchanges++;
    statUpdates[ex.receiver_id].received++;
  }

  for (const [userId, stats] of Object.entries(statUpdates)) {
    await supabase
      .from("profiles")
      .update({
        total_exchanges: stats.exchanges,
        total_given: stats.given,
        total_received: stats.received,
      })
      .eq("id", userId);
    console.log(`   Updated stats for ${userId.slice(0, 8)}...`);
  }

  // Recalculate trust scores manually
  console.log("\n6. Recalculating trust scores...");
  for (const userId of userIds) {
    const { data: userReviews } = await supabase
      .from("reviews")
      .select("rating")
      .eq("subject_id", userId);

    const { data: profile } = await supabase
      .from("profiles")
      .select("total_exchanges, total_given")
      .eq("id", userId)
      .single();

    if (userReviews && userReviews.length > 0 && profile) {
      const avgRating = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length;
      const score = Math.min(100, Math.max(0,
        avgRating * 10 +
        Math.min((profile.total_exchanges ?? 0) * 2, 15) +
        Math.min((profile.total_given ?? 0) * 0.5, 5)
      ));

      await supabase
        .from("profiles")
        .update({ trust_score: Math.round(score * 10) / 10 })
        .eq("id", userId);

      console.log(`   ${DEMO_USERS[userIds.indexOf(userId)]?.display_name}: trust score = ${Math.round(score)}`);
    }
  }

  // Step 4: Create discussion threads
  console.log("\n7. Creating discussion threads...");
  const threads = createThreads(userIds);
  const threadIds: string[] = [];

  for (const thread of threads) {
    const { data, error } = await supabase
      .from("discussion_threads")
      .insert(thread)
      .select("id")
      .single();

    if (error) {
      console.error(`   Failed to create thread:`, error.message);
    } else {
      threadIds.push(data.id);
      console.log(`   Created thread: "${thread.title}"`);
    }
  }

  // Create replies
  console.log("\n8. Creating discussion replies...");
  const replies = createReplies(threadIds, userIds);
  for (const reply of replies) {
    const { error } = await supabase.from("discussion_replies").insert(reply);
    if (error) {
      console.error(`   Failed to create reply:`, error.message);
    }
  }
  console.log(`   Created ${replies.length} replies`);

  // Step 5: Seed time-dollar ledger entries
  console.log("\n9. Creating time-dollar ledger entries...");

  // Starter bonuses for all 8 users (5 TD each)
  for (let i = 0; i < userIds.length; i++) {
    const { error } = await supabase.from("time_dollar_ledger").insert({
      user_id: userIds[i],
      exchange_id: null,
      amount: 5,
      balance_after: 5,
      description: "Welcome to Kula! Starter bonus of 5 Time Dollars",
      type: "starter_bonus",
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (error) {
      console.error(`   Failed to create starter bonus for user ${i}:`, error.message);
    }
  }
  console.log("   Created 8 starter bonuses (5 TD each)");

  // Exchange 3: Emma tutored David's kids (4 TD) — already in exchangeIds[3]
  if (exchangeIds[3]) {
    await supabase.from("time_dollar_ledger").insert({
      user_id: userIds[4], // Emma earns
      exchange_id: exchangeIds[3],
      amount: 4,
      balance_after: 9,
      description: "Earned 4 TD for math tutoring sessions",
      type: "exchange",
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await supabase.from("time_dollar_ledger").insert({
      user_id: userIds[3], // David spends
      exchange_id: exchangeIds[3],
      amount: -4,
      balance_after: 1,
      description: "Spent 4 TD for math tutoring for kids",
      type: "exchange",
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    });
    console.log("   Created ledger entries for Emma/David tutoring exchange (4 TD)");
  }

  // Additional time-dollar exchanges for richer wallet history
  // Exchange A: Priya taught yoga to Sarah (2 TD)
  const { data: tdExchangeA } = await supabase
    .from("exchange_agreements")
    .insert({
      post_id: postIds[2], // "Free Community Yoga"
      provider_id: userIds[2], // Priya
      receiver_id: userIds[0], // Sarah
      exchange_mode: "time_dollar" as const,
      terms: "2 private yoga sessions, 1 hour each",
      status: "completed" as const,
      provider_confirmed: true,
      receiver_confirmed: true,
      completed_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      time_dollar_amount: 2,
    })
    .select("id")
    .single();

  if (tdExchangeA) {
    await supabase.from("time_dollar_ledger").insert({
      user_id: userIds[2],
      exchange_id: tdExchangeA.id,
      amount: 2,
      balance_after: 7,
      description: "Earned 2 TD for private yoga sessions",
      type: "exchange",
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await supabase.from("time_dollar_ledger").insert({
      user_id: userIds[0],
      exchange_id: tdExchangeA.id,
      amount: -2,
      balance_after: 3,
      description: "Spent 2 TD for private yoga sessions with Priya",
      type: "exchange",
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    });
    console.log("   Created Priya/Sarah yoga exchange (2 TD)");
  }

  // Exchange B: Alex fixed Lisa's electronics (1.5 TD)
  const { data: tdExchangeB } = await supabase
    .from("exchange_agreements")
    .insert({
      post_id: postIds[7], // "Free Bike Tune-Ups" (Alex's post)
      provider_id: userIds[7], // Alex
      receiver_id: userIds[6], // Lisa
      exchange_mode: "time_dollar" as const,
      terms: "Fixed sewing machine motor and replaced tablet screen",
      status: "completed" as const,
      provider_confirmed: true,
      receiver_confirmed: true,
      completed_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      time_dollar_amount: 1.5,
    })
    .select("id")
    .single();

  if (tdExchangeB) {
    await supabase.from("time_dollar_ledger").insert({
      user_id: userIds[7],
      exchange_id: tdExchangeB.id,
      amount: 1.5,
      balance_after: 6.5,
      description: "Earned 1.5 TD for electronics repairs",
      type: "exchange",
      created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await supabase.from("time_dollar_ledger").insert({
      user_id: userIds[6],
      exchange_id: tdExchangeB.id,
      amount: -1.5,
      balance_after: 3.5,
      description: "Spent 1.5 TD for electronics repair by Alex",
      type: "exchange",
      created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    });
    console.log("   Created Alex/Lisa electronics repair exchange (1.5 TD)");
  }

  // Exchange C: Jamal cooked for Marcus (3 TD)
  const { data: tdExchangeC } = await supabase
    .from("exchange_agreements")
    .insert({
      post_id: postIds[5], // "Surplus Meals from My Test Kitchen"
      provider_id: userIds[5], // Jamal
      receiver_id: userIds[1], // Marcus
      exchange_mode: "time_dollar" as const,
      terms: "Meal prep for the week — 5 meals customized for Marcus",
      status: "completed" as const,
      provider_confirmed: true,
      receiver_confirmed: true,
      completed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      time_dollar_amount: 3,
    })
    .select("id")
    .single();

  if (tdExchangeC) {
    await supabase.from("time_dollar_ledger").insert({
      user_id: userIds[5],
      exchange_id: tdExchangeC.id,
      amount: 3,
      balance_after: 8,
      description: "Earned 3 TD for weekly meal prep service",
      type: "exchange",
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await supabase.from("time_dollar_ledger").insert({
      user_id: userIds[1],
      exchange_id: tdExchangeC.id,
      amount: -3,
      balance_after: 2,
      description: "Spent 3 TD for meal prep by Jamal",
      type: "exchange",
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    });
    console.log("   Created Jamal/Marcus meal prep exchange (3 TD)");
  }

  // Step 6: Seed invite records
  console.log("\n10. Creating invite records...");
  const inviteRecords = [
    {
      inviter_id: userIds[0], // Sarah invited Marcus
      code: "SARAH1",
      invited_email: "marcus.williams@demo.kula.community",
      used_by: userIds[1],
      used_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      inviter_id: userIds[0], // Sarah invited Priya
      code: "SARAH2",
      invited_email: "priya.patel@demo.kula.community",
      used_by: userIds[2],
      used_at: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      inviter_id: userIds[2], // Priya invited David
      code: "PRIYA1",
      invited_email: "david.rodriguez@demo.kula.community",
      used_by: userIds[3],
      used_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      inviter_id: userIds[1], // Marcus invited Emma
      code: "MARC01",
      invited_email: "emma.nakamura@demo.kula.community",
      used_by: userIds[4],
      used_at: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      inviter_id: userIds[3], // David invited Jamal
      code: "DAVID1",
      invited_email: "jamal.thompson@demo.kula.community",
      used_by: userIds[5],
      used_at: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      inviter_id: userIds[4], // Emma invited Lisa
      code: "EMMA01",
      invited_email: "lisa.oconnor@demo.kula.community",
      used_by: userIds[6],
      used_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      inviter_id: userIds[1], // Marcus invited Alex
      code: "MARC02",
      invited_email: "alex.kim@demo.kula.community",
      used_by: userIds[7],
      used_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      // Pending invite from Sarah
      inviter_id: userIds[0],
      code: "SARAH3",
      invited_email: "jorge@example.com",
      used_by: null,
      used_at: null,
    },
    {
      // Pending invite from Priya (no email)
      inviter_id: userIds[2],
      code: "PRIYA2",
      invited_email: null,
      used_by: null,
      used_at: null,
    },
  ];

  for (const invite of inviteRecords) {
    const { error } = await supabase.from("invites").insert(invite);
    if (error) {
      console.error(`   Failed to create invite ${invite.code}:`, error.message);
    }
  }
  console.log(`   Created ${inviteRecords.length} invite records (7 accepted, 2 pending)`);

  console.log("\n\u2705 Demo seed complete!");
  console.log(`   ${userIds.length} users`);
  console.log(`   ${postIds.length} posts`);
  console.log(`   ${exchangeIds.length + 3} completed exchanges (${exchangeIds.length} original + 3 new TD)`);
  console.log(`   ${reviews.length} reviews`);
  console.log(`   ${threadIds.length} discussion threads`);
  console.log(`   ${replies.length} replies`);
  console.log(`   8 starter bonuses + 8 exchange ledger entries`);
  console.log(`   ${inviteRecords.length} invite records`);
}

seed().catch(console.error);
