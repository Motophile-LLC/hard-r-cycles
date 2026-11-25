import {
  VIP_ORDER_THRESHOLD,
  VIP_SPEND_THRESHOLD,
  resolveCustomerMemoryState,
} from '@/features/npc-memory/resolver';
import type {
  ResolvedNpcMemoryState,
  ShopProduct,
  StaffDialogueState,
  StaffId,
} from '@/types/shop';
import { withSpriteVersion } from '@/utils/spriteVersion';

const portrait = (id: string): string =>
  withSpriteVersion(`/sprites/portraits/${id}.png`);

const STAFF_META: Record<
  StaffId,
  { name: string; role: string; defaultPortrait: string }
> = {
  v: {
    name: 'V',
    role: 'Apparel & Merch Boss',
    defaultPortrait: portrait('v-smirk'),
  },
  dick: {
    name: 'Dick',
    role: 'Owner & Master Mechanic',
    defaultPortrait: portrait('dick-glaring'),
  },
  scooter: {
    name: 'Scooter',
    role: 'Shop Apprentice',
    defaultPortrait: portrait('scooter-pop'),
  },
};

const QUICK_REPLIES: Record<StaffId, { label: string; query: string }[]> = {
  v: [
    { label: 'Show best sellers', query: 'best sellers shop humor' },
    { label: 'Got hoodies?', query: 'hoodie' },
    { label: 'How do sizes fit?', query: 'sizing fit fabric cotton' },
    { label: 'Why is Dick grumpy?', query: 'dick attitude' },
    { label: 'My shop status / VIP?', query: 'vip secret stash status tier' },
  ],
  dick: [
    { label: 'Shop policies', query: 'shipping returns refunds' },
    { label: 'Where is VIN Diag?', query: 'vin diagnostic repair' },
    { label: 'Got Dyna tees?', query: 'dyna' },
    { label: 'Flat Rate tips', query: 'flat rate panic game tips' },
    { label: 'My shop status / VIP?', query: 'vip secret stash status tier' },
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
  memoryState?: ResolvedNpcMemoryState,
): StaffDialogueState {
  const meta = STAFF_META[staffId];
  const mem = memoryState ?? resolveCustomerMemoryState(null, null);
  const tierBadge = mem.isSignedIn ? mem.tierBadge : undefined;

  if (staffId === 'v') {
    if (mem.hasVipAccess) {
      const vipDrops = products.filter(
        (p) =>
          p.active &&
          (p.rack_slot === 'vip_secret_stash' || p.rack_slot === 'hard_r_originals'),
      );
      return {
        staffId,
        portraitId: portrait('v-smirk'),
        moodLabel: 'VIP LOUNGE',
        tierBadge,
        speakerName: meta.name,
        speakerRole: meta.role,
        message: `Welcome back, ${mem.riderName}. You hit VIP status, so Dick finally unlocked the Secret Stash tab for you in my rack drawer.`,
        suggestedProducts: (vipDrops.length > 0 ? vipDrops : products).slice(0, 2),
        quickReplies: QUICK_REPLIES.v,
      };
    }

    return {
      staffId,
      portraitId: meta.defaultPortrait,
      moodLabel: 'RUNNING THE FLOOR',
      tierBadge,
      speakerName: meta.name,
      speakerRole: meta.role,
      message:
        'Welcome to Hard R Cycles. Racks 1 and 2 are stocked with heavy USA-made tees and hoodies while our exclusive Hard R drops are being printed. What are we looking for?',
      suggestedProducts: products.filter((p) => p.rack_slot === 'rack_1_humor').slice(0, 2),
      quickReplies: QUICK_REPLIES.v,
    };
  }

  if (staffId === 'dick') {
    const orders = mem.memory?.total_orders ?? 0;
    const spend = Number(mem.memory?.lifetime_spend ?? 0);

    if (mem.tier === 'VIP_SUPPORTER') {
      const vipSuggestions = products.filter(
        (p) =>
          p.active &&
          (p.rack_slot === 'vip_secret_stash' || p.rack_slot === 'hard_r_originals'),
      );
      return {
        staffId,
        portraitId: portrait('dick-stoked'),
        moodLabel: 'VIP RESPECT',
        tierBadge,
        speakerName: meta.name,
        speakerRole: meta.role,
        message: `Well, well — ${mem.riderName} is back (${orders} order${orders === 1 ? '' : 's'}, $${spend.toFixed(2)} on the books). I chased the tire-kickers off your gear and unlocked the Secret Stash rack for you.`,
        suggestedProducts: vipSuggestions.slice(0, 2),
        quickReplies: QUICK_REPLIES.dick,
      };
    }

    if (mem.tier === 'REPEAT_DIAGNOSTIC') {
      const bike = mem.memory?.last_diagnosed_bike || mem.primaryBike || 'that bike';
      const symptom = mem.memory?.last_symptom || 'that leak';
      return {
        staffId,
        portraitId: portrait('dick-eyeroll'),
        moodLabel: 'REPEAT DIAGNOSTIC',
        tierBadge,
        speakerName: meta.name,
        speakerRole: meta.role,
        message: `Did you ever fix ${symptom} on your ${bike}, ${mem.riderName}, or are you just here to burn through more of my shop rags?`,
        suggestedProducts: [],
        quickReplies: QUICK_REPLIES.dick,
      };
    }

    if (mem.tier === 'FIRST_TIME_BUYER') {
      const lastItem = mem.memory?.last_purchased_item || 'that shirt';
      return {
        staffId,
        portraitId: portrait('dick-smartass'),
        moodLabel: 'PAID CUSTOMER',
        tierBadge,
        speakerName: meta.name,
        speakerRole: meta.role,
        message: `Oh, look who actually spent a buck — how's that ${lastItem} treating you, ${mem.riderName}? Hit ${VIP_ORDER_THRESHOLD} orders or $${VIP_SPEND_THRESHOLD} and I might unlock the VIP Secret Stash.`,
        suggestedProducts: products
          .filter((p) => p.active && p.rack_slot !== 'vip_secret_stash')
          .slice(0, 2),
        quickReplies: QUICK_REPLIES.dick,
      };
    }

    if (mem.tier === 'WINDOW_SHOPPER') {
      const kicks = mem.memory?.loiter_kick_count ?? 0;
      const kickJab =
        kicks > 0
          ? ` Plus I already yelled at you ${kicks} time${kicks === 1 ? '' : 's'} for loitering.`
          : '';
      return {
        staffId,
        portraitId: portrait('dick-furious'),
        moodLabel: 'WINDOW SHOPPER',
        tierBadge,
        speakerName: meta.name,
        speakerRole: meta.role,
        message: `Visit #${mem.visitCount} and still $0 on the register, ${mem.riderName}? This ain't a museum — buy a shirt or beat it before I hand you a broom.${kickJab}`,
        suggestedProducts: products
          .filter((p) => p.active && p.rack_slot !== 'vip_secret_stash')
          .slice(0, 2),
        quickReplies: QUICK_REPLIES.dick,
      };
    }

    const bikeNote = mem.primaryBike
      ? ` Saw your ${mem.primaryBike} in the garage log.`
      : '';
    const shiftNote =
      (mem.memory?.flat_rate_high_score ?? 0) >= 100
        ? ` Not half bad pulling ${mem.memory?.flat_rate_high_score.toFixed(1)}% in the bays either.`
        : '';

    return {
      staffId,
      portraitId: meta.defaultPortrait,
      moodLabel: 'GLARING AT COUNTER',
      tierBadge,
      speakerName: meta.name,
      speakerRole: meta.role,
      message: `Read the signs behind me before opening your mouth. Cash or card via checkout, no refunds if you bleed oil on it, and if you want to prove you know which end of a torque wrench to hold, click a Service Bay.${bikeNote}${shiftNote}`,
      suggestedProducts: [],
      quickReplies: QUICK_REPLIES.dick,
    };
  }

  const bestShift = mem.memory?.flat_rate_high_score ?? 0;
  return {
    staffId,
    portraitId: meta.defaultPortrait,
    moodLabel: 'CHEWING BUBBLEGUM',
    tierBadge,
    speakerName: meta.name,
    speakerRole: meta.role,
    message:
      bestShift >= 90
        ? `*POP!* Yo ${mem.riderName}! I saw you pull ${bestShift.toFixed(1)}% efficiency on the lifts! Wanna check out Talkin Braap hoodies or run Bay 3 again?`
        : '*POP!* Oh hey! Dick told me not to touch the customers’ bikes until I find my 10mm socket. Wanna check out the Talkin Braap hoodies or go clock into Bay 3?',
    suggestedProducts: products.filter((p) => p.rack_slot === 'wall_braap').slice(0, 2),
    quickReplies: QUICK_REPLIES.scooter,
  };
}

export function resolveStaffReply(
  staffId: StaffId,
  rawQuery: string,
  products: ShopProduct[],
  memoryState?: ResolvedNpcMemoryState,
): StaffDialogueState {
  const q = rawQuery.trim().toLowerCase();
  const meta = STAFF_META[staffId];
  const mem = memoryState ?? resolveCustomerMemoryState(null, null);
  const tierBadge = mem.isSignedIn ? mem.tierBadge : undefined;
  const visibleProducts = mem.hasVipAccess
    ? products
    : products.filter((p) => p.rack_slot !== 'vip_secret_stash');
  const matched = findMatchingProducts(q, visibleProducts);

  // -1. Shop Status / VIP Memory check ($0 local lookup)
  if (/\bvip\b|secret stash|shop status|my status|my tier|memory|spend|loyal/.test(q)) {
    const vipProducts = visibleProducts.filter((p) => p.rack_slot === 'vip_secret_stash');
    if (!mem.isSignedIn) {
      return {
        staffId,
        portraitId:
          staffId === 'v'
            ? portrait('v-smirk')
            : staffId === 'dick'
              ? portrait('dick-glaring')
              : portrait('scooter-pop'),
        moodLabel: 'SSO REQUIRED',
        speakerName: meta.name,
        speakerRole: meta.role,
        message:
          staffId === 'dick'
            ? `Sign in with Google or Apple first — I don't keep tabs on ghosts. Hit ${VIP_ORDER_THRESHOLD} orders or $${VIP_SPEND_THRESHOLD} spend and you unlock my Secret Stash rack and 10-minute idle grace.`
            : staffId === 'v'
              ? `Sign in with Google or Apple in the top bar so Dick remembers your orders, garage bikes, and Flat Rate high scores. ${VIP_ORDER_THRESHOLD} orders or $${VIP_SPEND_THRESHOLD} unlocks VIP Secret Stash.`
              : `Sign in with Google or Apple! Then Dick tracks your orders, diagnostics, and Flat Rate Bay scores toward the VIP Secret Stash!`,
        suggestedProducts: [],
        quickReplies: QUICK_REPLIES[staffId],
      };
    }

    const orders = mem.memory?.total_orders ?? 0;
    const spend = Number(mem.memory?.lifetime_spend ?? 0);
    const diags = mem.memory?.diagnostic_count ?? 0;
    const highScore = mem.memory?.flat_rate_high_score ?? 0;
    const kicks = mem.memory?.loiter_kick_count ?? 0;

    return {
      staffId,
      portraitId: mem.hasVipAccess
        ? staffId === 'v'
          ? portrait('v-smirk')
          : portrait('dick-stoked')
        : staffId === 'dick'
          ? portrait('dick-smartass')
          : meta.defaultPortrait,
      moodLabel: mem.hasVipAccess ? 'VIP UNLOCKED' : mem.tierBadge.toUpperCase(),
      tierBadge,
      speakerName: meta.name,
      speakerRole: meta.role,
      message: `${mem.riderName} (${mem.tierBadge}): ${orders}/${VIP_ORDER_THRESHOLD} orders, $${spend.toFixed(2)}/$${VIP_SPEND_THRESHOLD} spend, ${diags} diagnostic${diags === 1 ? '' : 's'}, best lift ${highScore.toFixed(1)}%, loiter warnings ${kicks}. VIP Secret Stash: ${mem.hasVipAccess ? 'UNLOCKED' : 'LOCKED'}.`,
      suggestedProducts: mem.hasVipAccess ? vipProducts.slice(0, 2) : [],
      quickReplies: QUICK_REPLIES[staffId],
    };
  }

  // 0. Flat Rate Panic discount codes / Cart rewards
  if (/discount|coupon|promo|reward|cart|bag|code|free shipping/.test(q)) {
    const originals = products.filter((p) => p.checkout_mode !== 'shopify_link').slice(0, 2);
    return {
      staffId,
      portraitId:
        staffId === 'v'
          ? portrait('v-smirk')
          : staffId === 'dick'
            ? portrait('dick-stoked')
            : portrait('scooter-hyped'),
      moodLabel: 'SHIFT REWARDS',
      tierBadge,
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
        portraitId: portrait('v-smirk'),
        moodLabel: 'BUY IT.',
        tierBadge,
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
        portraitId: portrait('dick-smartass'),
        moodLabel: 'STRAIGHT TALK',
        tierBadge,
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
      portraitId: portrait('scooter-clueless'),
      moodLabel: 'CLUELESS',
      tierBadge,
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
          ? portrait('v-eyeroll')
          : staffId === 'dick'
            ? portrait('dick-furious')
            : portrait('scooter-duh'),
      moodLabel: staffId === 'dick' ? 'READ THE SIGN!' : 'STORE POLICY',
      tierBadge,
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
          ? portrait('dick-eyeroll')
          : staffId === 'v'
            ? portrait('v-eyeroll')
            : portrait('scooter-whoa'),
      moodLabel: 'SERVICE COUNTER',
      tierBadge,
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
          ? portrait('v-smirk')
          : staffId === 'dick'
            ? portrait('dick-smartass')
            : portrait('scooter-hyped'),
      moodLabel: 'SERVICE BAYS LIVE',
      tierBadge,
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
        portraitId: portrait('v-eyeroll'),
        moodLabel: 'REALLY, DICK?!',
        tierBadge,
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
        portraitId: portrait('scooter-busted'),
        moodLabel: 'OOPS...',
        tierBadge,
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
      portraitId: portrait('dick-wtf'),
      moodLabel: 'WTF?!',
      tierBadge,
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
          ? portrait('v-smirk')
          : staffId === 'dick'
            ? portrait('dick-smartass')
            : portrait('scooter-hyped'),
      moodLabel: staffId === 'v' ? 'BUY IT.' : 'FOUND ON RACK',
      tierBadge,
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
      portrait: portrait('v-eyeroll'),
      mood: 'NICE TRY',
      line: 'Honey, I sell shop gear and keep Dick out of jail. Try asking about tees, hoodies, sizing, or pick a topic below.',
    },
    dick: {
      portrait: portrait('dick-wtf'),
      mood: 'WTF?!',
      line: 'Do I look like Google? Ask about merch, sizing, shop rules, or go clock into a Service Bay before I charge you $200/hr for loitering!',
    },
    scooter: {
      portrait: portrait('scooter-duh'),
      mood: 'DUH...',
      line: '*POP!* Uhhh... Dick told me not to answer stuff I don’t know. Wanna see the Shop Humor shirts or play Flat Rate Panic?',
    },
  };
  const d = deflects[staffId];
  return {
    staffId,
    portraitId: d.portrait,
    moodLabel: d.mood,
    tierBadge,
    speakerName: meta.name,
    speakerRole: meta.role,
    message: d.line,
    suggestedProducts: [],
    quickReplies: QUICK_REPLIES[staffId],
  };
}
