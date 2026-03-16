import React from "react";
import { Composition, registerRoot } from "remotion";
import { DemoComposition } from "./DemoComposition";

const RemotionRoot = () => (
  <Composition
    id="EchoComplianceDemo"
    component={DemoComposition}
    durationInFrames={270}
    fps={30}
    width={1920}
    height={1080}
  />
);

registerRoot(RemotionRoot);
