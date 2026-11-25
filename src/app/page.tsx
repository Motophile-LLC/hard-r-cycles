import { Suspense } from 'react';
import { UnifiedShopCanvasWrapper } from '@/components/canvas/UnifiedShopCanvasWrapper';
import { TorqueMiniGame } from '@/components/minigames/TorqueMiniGame';
import { WiringMiniGame } from '@/components/minigames/WiringMiniGame';
import { AccountModal } from '@/components/shop/AccountModal';
import { FlatRateMasterModal } from '@/components/shop/FlatRateMasterModal';
import { FrontDoorGateModal } from '@/components/shop/FrontDoorGateModal';
import { ServiceCounterModal } from '@/components/shop/ServiceCounterModal';
import { ShopDeepLinkRouter } from '@/components/shop/ShopDeepLinkRouter';
import { ShopDrawer } from '@/components/shop/ShopDrawer';
import { ShopFloorHUD } from '@/components/shop/ShopFloorHUD';
import { StaffDialogueBox } from '@/components/shop/StaffDialogueBox';
import { ClockInModal } from '@/components/ui/ClockInModal';
import { ExtraBoltDialog } from '@/components/ui/ExtraBoltDialog';
import { GameHUD } from '@/components/ui/GameHUD';
import { RepairOrderModal } from '@/components/ui/RepairOrderModal';
import { TutorialWalkthrough } from '@/components/ui/TutorialWalkthrough';
import { ShopWallAtlasModal } from '@/features/atlas/ShopWallAtlasModal';
import { RoastCardModal } from '@/features/roast-card/RoastCardModal';

export default function HomePage() {
  return (
    <main className="relative h-dvh w-dvw overflow-hidden bg-stone-900">
      <UnifiedShopCanvasWrapper />

      {/* Storefront / Dealership Floor Overlays */}
      <ShopFloorHUD />
      <StaffDialogueBox />
      <ShopDrawer />
      <ServiceCounterModal />
      <FlatRateMasterModal />
      <ShopWallAtlasModal />
      <AccountModal />
      <RoastCardModal />
      <FrontDoorGateModal />
      <Suspense fallback={null}>
        <ShopDeepLinkRouter />
      </Suspense>

      {/* Flat Rate Panic Service Bay Overlays */}
      <GameHUD />
      <TutorialWalkthrough />
      <TorqueMiniGame />
      <WiringMiniGame />
      <ClockInModal />
      <ExtraBoltDialog />
      <RepairOrderModal />
    </main>
  );
}
