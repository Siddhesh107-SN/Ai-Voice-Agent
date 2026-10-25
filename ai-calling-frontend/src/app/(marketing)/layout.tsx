import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import IntroReel from "@/components/IntroReel";
import SmoothScroll from "@/components/SmoothScroll";
import RevealObserver from "@/components/RevealObserver";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <IntroReel />
      <Nav />
      <main id="main">{children}</main>
      <Footer />
      <SmoothScroll />
      <RevealObserver />
    </>
  );
}
