import Hero from "@/components/Hero";
import DayFillsUp from "@/components/DayFillsUp";
import About from "@/components/About";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import TicketRoll from "@/components/TicketRoll";
import TryIt from "@/components/TryIt";
import WhoFor from "@/components/WhoFor";
import WhyChoose from "@/components/WhyChoose";
import ReviewStory from "@/components/ReviewStory";
import FinalCta from "@/components/FinalCta";

export default function Home() {
  return (
    <>
      <Hero />
      <DayFillsUp />
      <About />
      <Features />
      <HowItWorks />
      <TicketRoll />
      <TryIt />
      <WhoFor />
      <WhyChoose />
      <ReviewStory />
      <FinalCta />
    </>
  );
}
