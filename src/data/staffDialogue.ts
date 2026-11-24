import type { ShopProduct, StaffDialogueState, StaffId } from '@/types/shop';

const STAFF_META: Record<
  StaffId,
  { name: string; role: string; defaultPortrait: string }
> = {
  v: {
    name: 'V',
    role: 'Apparel & Merch Boss',
    defaultPortrait: '/sprites/portraits/v-smirk.png',
  },
  dick: {
    name: 'Dick',
    role: 'Owner & Master Mechanic',
    defaultPortrait: '/sprites/portraits/dick-glaring.png',
  },
  scooter: {
    name: 'Scooter',
    role: 'Shop Apprentice',
    defaultPortrait: '/sprites/portraits/scooter-pop.png',
  },
};

const QUICK_REPLIES: Record<StaffId, { label: string; query: string }[]> = {
  v: [
    { label: 'Show best sellers', query: 'best sellers shop humor' },
    { label: 'Got hoodies?', query: 'hoodie' },
    { label: 'How do sizes fit?', query: 'sizing fit fabric cotton' },
    { label: 'Why is Dick grumpy?', query: 'dick attitude' },
  ],
  dick: [
    { label: 'Shop policies', query: 'shipping returns refunds' },
    { label: 'Where is VIN Diag?', query: 'vin diagnostic repair' },
    { label: 'Got Dyna tees?', query: 'dyna' },
    { label: 'Flat Rate tips', query: 'flat rate panic game tips' },
  ],
  scooter: [
    { label: 'What should I buy?', query: 'recommend merch tee' },
    { label: 'How do I play Bays?', query: 'game flat rate bay sockets' },
    { label: 'Drop any wrenches today?', query: 'wrench dropped' },
    { label: 'Talkin Braap gear?', query: 'braap podcast' },
  ],
};

function findMatchingProducts(query: string, products: ShopProduct[]): ShopProduct[] {
  const q = query.toLowerCase();
  const scored = products
    .filter((p) => p.active)
    .map((p) => {
      let score = 0;
      const haystack = `${p.title} ${p.collection} ${p.tags.join(' ')} ${p.fit_notes}`.toLowerCase();
      if (q.includes('hoodie') && haystack.includes('hoodie')) score += 5;
      if ((q.includes('tee') || q.includes('shirt') || q.includes('t-shirt')) && !haystack.includes('hoodie')) score += 3;
      if (q.includes('dyna') && haystack.includes('dyna')) score += 6;
      if (q.includes('sportster') && haystack.includes('sportster')) score += 6;
      if (q.includes('chopper') && haystack.includes('chopper')) score += 6;
      if (q.includes('braap') && haystack.includes('braap')) score += 6;
      if (q.includes('definition') && haystack.includes('definition')) score += 5;
      if (q.includes('humor') && p.rack_slot === 'rack_1_humor') score += 4;
      for (const word of q.split(/\s+/)) {
        if (word.length >= 3 && haystack.includes(word)) {
          score += 2;
        }
      }
      if (
        ['2xl', '3xl', '4xl', 'xl', 'xs', 'large', 'medium', 'small'].some((sz) =>
          q.includes(sz),
        )
      ) {
        const sizeMatch = p.sizes.some((s) => q.includes(s.toLowerCase()));
        if (sizeMatch) score += 2;
      }
      return { product: p, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map((s) => s.product);
}

export function getStaffGreeting(
  staffId: StaffId,
  products: ShopProduct[],
): StaffDialogueState {
  const meta = STAFF_META[staffId];

  if (staffId === 'v') {
    return {
      staffId,
      portraitId: meta.defaultPortrait,
      moodLabel: 'RUNNING THE FLOOR',
      speakerName: meta.name,
      speakerRole: meta.role,
      message:
        'Welcome to Hard R Cycles. Racks 1 and 2 are stocked with heavy USA-made tees and hoodies while our exclusive Hard R drops are being printed. What are we looking for?',
      suggestedProducts: products.filter((p) => p.rack_slot === 'rack_1_humor').slice(0, 2),
      quickReplies: QUICK_REPLIES.v,
    };
  }

  if (staffId === 'dick') {
    return {
      staffId,
      portraitId: meta.defaultPortrait,
      moodLabel: 'GLARING AT COUNTER',
      speakerName: meta.name,
      speakerRole: meta.role,
      message:
        'Read the signs behind me before opening your mouth. Cash or card via checkout, no refunds if you bleed oil on it, and if you want to prove you know which end of a torque wrench to hold, click a Service Bay.',
      suggestedProducts: [],
      quickReplies: QUICK_REPLIES.dick,
    };
  }

  return {
    staffId,
    portraitId: meta.defaultPortrait,
    moodLabel: 'CHEWING BUBBLEGUM',
    speakerName: meta.name,
    speakerRole: meta.role,
    message:
      '*POP!* Oh hey! Dick told me not to touch the customers’ bikes until I find my 10mm socket. Wanna check out the Talkin Braap hoodies or go clock into Bay 3?',
      suggestedProducts: products.filter((p) => p.rack_slot === 'wall_braap').slice(0, 2),
      quickReplies: QUICK_REPLIES.scooter,
    };
}

export function resolveStaffReply(
  staffId: StaffId,
  rawQuery: string,
  products: ShopProduct[],
): StaffDialogueState {
  const q = rawQuery.trim().toLowerCase();
  const meta = STAFF_META[staffId];
  const matched = findMatchingProducts(q, products);

  // 0. Flat Rate Panic discount codes / Cart rewards
  if (/discount|coupon|promo|reward|cart|bag|code|free shipping/.test(q)) {
    const originals = products.filter((p) => p.checkout_mode !== 'shopify_link').slice(0, 2);
    return {
      staffId,
      portraitId:
        staffId === 'v'
          ? '/sprites/portraits/v-smirk.png'
          : staffId === 'dick'
            ? '/sprites/portraits/dick-stoked.png'
            : '/sprites/portraits/scooter-hyped.png',
      moodLabel: 'SHIFT REWARDS',
      speakerName: meta.name,
      speakerRole: meta.role,
      message:
        staffId === 'v'
          ? 'Finish a shift in Flat Rate Panic at 90%+, 110%+, or 130%+ efficiency to claim a 5%, 10%, or 15% promo code for Hard R Originals in your Cart. Orders $125+ also ship FREE.'
          : staffId === 'dick'
            ? 'Want a discount? Earn it on a lift! Beat 90% flat-rate efficiency on at least one job and claim your single-use code on the Repair Order ticket. Direct orders over $125 ship free.'
            : 'Beat 90% efficiency in Bay 3 and you unlock real discount codes for the Cart! Over $125 ships free too!',
      suggestedProducts: originals.length > 0 ? originals : products.slice(0, 2),
      quickReplies: QUICK_REPLIES[staffId],
    };
  }

  // 1. Sizing / Fabric / Quality questions
  if (/size|sizing|fit|shrink|cotton|fleece|fabric|2xl|3xl|4xl|xs/.test(q)) {
    if (staffId === 'v') {
      return {
        staffId,
        portraitId: '/sprites/portraits/v-smirk.png',
        moodLabel: 'BUY IT.',
        speakerName: meta.name,
        speakerRole: meta.role,
        message:
          'All our tees are heavyweight 100% cotton, USA & Union Made in S through 4XL (true unisex shop fit). Hoodies are mid-weight USA-made fleece in XS through 4XL. Pick whatever size you wear over a wrench.',
        suggestedProducts: matched.length > 0 ? matched : products.slice(0, 2),
        quickReplies: QUICK_REPLIES.v,
      };
    }
    if (staffId === 'dick') {
      return {
        staffId,
        portraitId: '/sprites/portraits/dick-smartass.png',
        moodLabel: 'STRAIGHT TALK',
        speakerName: meta.name,
        speakerRole: meta.role,
        message:
          'Tees run S to 4XL, hoodies run XS to 4XL, heavyweight USA cotton. If you are built like a snowplow, size up. Simple.',
        suggestedProducts: matched.slice(0, 2),
        quickReplies: QUICK_REPLIES.dick,
      };
    }
    return {
      staffId,
      portraitId: '/sprites/portraits/scooter-clueless.png',
      moodLabel: 'CLUELESS',
      speakerName: meta.name,
      speakerRole: meta.role,
      message:
        'Uh, V says tees go up to 4XL and hoodies start at XS! I wear Large so I have room to hide snacks from Dick.',
      suggestedProducts: matched.slice(0, 2),
      quickReplies: QUICK_REPLIES.scooter,
    };
  }

  // 2. Shipping / Returns / Checkout / Motophile link questions
  if (/ship|shipping|return|refund|shopify|motophile|order|price|cost/.test(q)) {
    return {
      staffId,
      portraitId:
        staffId === 'v'
          ? '/sprites/portraits/v-eyeroll.png'
          : staffId === 'dick'
            ? '/sprites/portraits/dick-furious.png'
            : '/sprites/portraits/scooter-duh.png',
      moodLabel: staffId === 'dick' ? 'READ THE SIGN!' : 'STORE POLICY',
      speakerName: meta.name,
      speakerRole: meta.role,
      message:
        staffId === 'dick'
          ? 'Tees run $38.84–$44.84 and hoodies run $70.04–$76.04 depending on size. Right now the launch racks check out straight through our Motophile USA Shopify pipeline until Hard R exclusive print drops go live!'
          : staffId === 'v'
            ? 'Tees are $38.84–$44.84 and hoodies are $70.04–$76.04 (up to 4XL). Clicking "Buy" sends you cleanly to our verified Ninja POD Shopify checkout so your gear prints and ships fast.'
            : 'Clicking any Buy button takes you to checkout so Ninja prints and ships it while I sweep the bays!',
      suggestedProducts: matched.slice(0, 2),
      quickReplies: QUICK_REPLIES[staffId],
    };
  }

  // 3. VIN Diagnostic counter questions
  if (/vin|diag|diagnostic|repair|broken|leak|noise|engine|flat rate master/.test(q)) {
    return {
      staffId,
      portraitId:
        staffId === 'dick'
          ? '/sprites/portraits/dick-eyeroll.png'
          : staffId === 'v'
            ? '/sprites/portraits/v-eyeroll.png'
            : '/sprites/portraits/scooter-whoa.png',
      moodLabel: 'SERVICE COUNTER',
      speakerName: meta.name,
      speakerRole: meta.role,
      message:
        staffId === 'dick'
          ? 'The AI VIN Diagnostic counter is getting wired up from Flat Rate Master in a later drop. Until then, labor is $100/hr — $200 if you watch — or go clock into a Service Bay and fix one yourself!'
          : staffId === 'v'
            ? 'Dick is still arguing with the VIN scanner wiring. Go play Flat Rate Panic in the bays or grab a Shop Humor shirt while he calms down.'
            : 'Dick tried hooking up the VIN tool with jumper cables earlier... we are waiting for Phase 5!',
      suggestedProducts: [],
      quickReplies: QUICK_REPLIES[staffId],
    };
  }

  // 4. Flat Rate Panic gameplay tips
  if (/game|bay|play|panic|socket|torque|wrench|breaker|score/.test(q)) {
    return {
      staffId,
      portraitId:
        staffId === 'v'
          ? '/sprites/portraits/v-smirk.png'
          : staffId === 'dick'
            ? '/sprites/portraits/dick-smartass.png'
            : '/sprites/portraits/scooter-hyped.png',
      moodLabel: 'SERVICE BAYS LIVE',
      speakerName: meta.name,
      speakerRole: meta.role,
      message:
        staffId === 'dick'
          ? 'Click any lift on the right side of the shop to clock in. Match tools [1–6], hit [Space] in the green torque zone, catch dropped 10mm sockets before stepping in oil, and shoo Dyna Bro [E] before he nukes your chaos meter!'
          : staffId === 'scooter'
            ? 'Wait — if you drop a 10mm socket, DO NOT step in the oil puddle! Also when everybody is playing on the bays, you can see sparks and smoke right here on the shop floor!'
            : 'Click Bay 1, 2, or 3 on the right to jump straight into Flat Rate Panic. Everyone browsing the store sees your lift go crazy in real time.',
      suggestedProducts: [],
      quickReplies: QUICK_REPLIES[staffId],
    };
  }

  // 5. Dick / V / Scooter roast banter
  if (/dick|grumpy|rude|wife|married|wrench dropped/.test(q)) {
    if (staffId === 'v') {
      return {
        staffId,
        portraitId: '/sprites/portraits/v-eyeroll.png',
        moodLabel: 'REALLY, DICK?!',
        speakerName: meta.name,
        speakerRole: meta.role,
        message:
          'He has been yelling at a Sportster carburetor since 7 AM and skipped lunch. Buy a hoodie so I do not have to listen to him complain about floor rent.',
        suggestedProducts: products.filter((p) => p.title.toLowerCase().includes('hoodie')).slice(0, 2),
        quickReplies: QUICK_REPLIES.v,
      };
    }
    if (staffId === 'scooter') {
      return {
        staffId,
        portraitId: '/sprites/portraits/scooter-busted.png',
        moodLabel: 'OOPS...',
        speakerName: meta.name,
        speakerRole: meta.role,
        message:
          'I only dropped the torque wrench twice today! Dick said if I drop a third one I am paying for it out of my bubblegum budget.',
        suggestedProducts: [],
        quickReplies: QUICK_REPLIES.scooter,
      };
    }
    return {
      staffId,
      portraitId: '/sprites/portraits/dick-wtf.png',
      moodLabel: 'WTF?!',
      speakerName: meta.name,
      speakerRole: meta.role,
      message:
        'Look around—Scooter loses tools, Dyna Bro wants free labor, and V buys more hoodies. Somebody’s gotta keep the lights on!',
      suggestedProducts: [],
      quickReplies: QUICK_REPLIES.dick,
    };
  }

  // 6. Product catalog match!
  if (matched.length > 0) {
    return {
      staffId,
      portraitId:
        staffId === 'v'
          ? '/sprites/portraits/v-smirk.png'
          : staffId === 'dick'
            ? '/sprites/portraits/dick-smartass.png'
            : '/sprites/portraits/scooter-hyped.png',
      moodLabel: staffId === 'v' ? 'BUY IT.' : 'FOUND ON RACK',
      speakerName: meta.name,
      speakerRole: meta.role,
      message:
        staffId === 'v'
          ? `Got ${matched.length} sharp pick${matched.length > 1 ? 's' : ''} right on the rack for that—USA-made and ready to ship:`
          : staffId === 'dick'
            ? `Here is what matches on V’s racks. Pick your size and don’t hold up the counter:`
            : `Ooh! I saw V hanging these up earlier — check these out:`,
      suggestedProducts: matched,
      quickReplies: QUICK_REPLIES[staffId],
    };
  }

  // 7. Zero-API in-character deflect for random / unmatched text
  const deflects: Record<StaffId, { portrait: string; mood: string; line: string }> = {
    v: {
      portrait: '/sprites/portraits/v-eyeroll.png',
      mood: 'NICE TRY',
      line: 'Honey, I sell shop gear and keep Dick out of jail. Try asking about tees, hoodies, sizing, or pick a topic below.',
    },
    dick: {
      portrait: '/sprites/portraits/dick-wtf.png',
      mood: 'WTF?!',
      line: 'Do I look like Google? Ask about merch, sizing, shop rules, or go clock into a Service Bay before I charge you $200/hr for loitering!',
    },
    scooter: {
      portrait: '/sprites/portraits/scooter-duh.png',
      mood: 'DUH...',
      line: '*POP!* Uhhh... Dick told me not to answer stuff I don’t know. Wanna see the Shop Humor shirts or play Flat Rate Panic?',
    },
  };
  const d = deflects[staffId];
  return {
    staffId,
    portraitId: d.portrait,
    moodLabel: d.mood,
    speakerName: meta.name,
    speakerRole: meta.role,
    message: d.line,
    suggestedProducts: [],
    quickReplies: QUICK_REPLIES[staffId],
  };
}
