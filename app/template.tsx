import { StairsTransition } from "@/components/motion/StairsTransition";

// template пересоздаётся при каждой навигации — запускаем «ступени»
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StairsTransition />
      {children}
    </>
  );
}
