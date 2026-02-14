import { TransparentBody } from "./transparent-body";

/**
 * Embed 專用 layout：讓整頁（html/body）背景透明，配合擴充陪伴模式「只有小黑炭、無外框」。
 */
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TransparentBody />
      {children}
    </>
  );
}
