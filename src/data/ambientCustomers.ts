import type { AmbientCustomerEvent } from '@/types/shop';

export const AMBIENT_CUSTOMER_EVENTS: AmbientCustomerEvent[] = [
  {
    id: 'reddit-fuse-expert',
    sprite: 'customer-1',
    characterName: 'Chrome Carl',
    bubbleText: 'Saw on Reddit this Dyna no-start is just a $2 fuse, right?',
    staffResponder: 'dick',
    staffReply:
      "Reddit didn't smell your burnt stator, Carl. Leave the keys or buy a wrenching tee and try a bay yourself.",
    suggestedQuery: 'mechanical',
    position: [-2.2, 0.05, 5.9],
  },
  {
    id: 'free-scanner-bagger',
    sprite: 'customer-2',
    characterName: 'Big-Wheel Lou',
    bubbleText: 'Can you plug your computer in real quick? Takes two seconds.',
    staffResponder: 'dick',
    staffReply:
      "Diag is $95, Lou. Watching me plug it in is $175. Check our shop shirts while you think it over.",
    suggestedQuery: 'shop',
    position: [2.3, 0.05, 5.4],
  },
  {
    id: 'upside-down-manual',
    sprite: 'customer-3',
    characterName: 'Touring Ted',
    bubbleText: 'Manual says drain BOTH holes... why did my belt start slipping?',
    staffResponder: 'scooter',
    staffReply:
      'Whoa—wrong drain plug, boss! Good news: Dick only yells for five minutes. Grab a rag tee first!',
    suggestedQuery: 'tee',
    position: [3.4, 0.05, 2.2],
  },
  {
    id: 'lost-10mm-thief',
    sprite: 'shop-buddy',
    characterName: '10mm Johnny',
    bubbleText: 'Wait—did anybody just see my deep 10mm roll under Bay 2?',
    staffResponder: 'v',
    staffReply:
      "Check Scooter's cufflinks. Meanwhile we restocked apparel racks that don't walk off the bench.",
    suggestedQuery: 'hoodie',
    position: [0.4, 0.05, 4.9],
  },
  {
    id: 'straight-pipe-neighbor',
    sprite: 'customer-2',
    characterName: 'Drag-Pipe Devon',
    bubbleText: 'Need louder baffles before my HOA president wakes up at 6 AM.',
    staffResponder: 'v',
    staffReply:
      "Hon, we got Talkin' Braap shirts louder than your slip-ons. Pick your poison over on the back wall.",
    suggestedQuery: 'braap',
    position: [-4.6, 0.05, 3.8],
  },
  {
    id: 'buddy-did-it-cheaper',
    sprite: 'customer-1',
    characterName: 'Barstool Bobby',
    bubbleText: 'My buddy wired these apes in his driveway with Scotch tape!',
    staffResponder: 'dick',
    staffReply:
      'Your buddy owes you a fire extinguisher, Bobby. Grab an oil-stained tee while Scooter sweeps the ashes.',
    suggestedQuery: 'torque',
    position: [-1.1, 0.05, 4.4],
  },
  {
    id: 'torque-by-feel',
    sprite: 'customer-3',
    characterName: 'Touring Ted',
    bubbleText: 'Three ugga-duggas on the oil pan bolt counts as aluminum spec, right?',
    staffResponder: 'dick',
    staffReply:
      'Congratulations, Ted. You just invented the self-draining sump. Grab a discounted shirt after a winning bay shift!',
    suggestedQuery: 'discount',
    position: [5.0, 0.05, 3.2],
  },
  {
    id: 'showroom-flex',
    sprite: 'customer-2',
    characterName: 'Big-Wheel Lou',
    bubbleText: 'How much for a hoodie that says I actually turned a wrench today?',
    staffResponder: 'v',
    staffReply:
      "Hon, beat 90% flat-rate efficiency on Bay 3 and you unlock a real Hard R Originals discount code.",
    suggestedQuery: 'hoodie',
    position: [-5.8, 0.05, 1.8],
  },
];

export function pickNextAmbientCustomer(lastId?: string): AmbientCustomerEvent {
  const pool = AMBIENT_CUSTOMER_EVENTS.filter((e) => e.id !== lastId);
  const chosenPool = pool.length > 0 ? pool : AMBIENT_CUSTOMER_EVENTS;
  const idx = Math.floor(Math.random() * chosenPool.length);
  return chosenPool[idx] ?? AMBIENT_CUSTOMER_EVENTS[0];
}
