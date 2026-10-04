import React, { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { hasHomeIntroPlayedThisSession } from "../utils/homeIntroSession";
import {
  Briefcase,
  Users,
  Zap,
  CheckCircle,
  GraduationCap,
  Rocket,
  ArrowRight,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const INTRO_DURATION = 9.2;
const INTRO_CONTENT_REVEAL_DELAY = 7.85;

const openPartnerSignup = () => {
  window.dispatchEvent(new CustomEvent("asiatech:partner-signup"));
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] },
  },
};

const heroContent = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delayChildren: 0.25, staggerChildren: 0.12 },
  },
};

const heroItem = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const FEATURES = [
  {
    number: "01",
    icon: Users,
    title: "Create Your Profile",
    description: "Build your professional profile and upload your resume.",
    color: "#1E5D46",
  },
  {
    number: "02",
    icon: Briefcase,
    title: "Discover Opportunities",
    description: "Explore OJT, internship, and employment opportunities.",
    color: "#1E5D46",
  },
  {
    number: "03",
    icon: Zap,
    title: "Connect & Apply",
    description: "Apply to opportunities and connect with potential employers.",
    color: "#1E5D46",
  },
];

const OPPORTUNITIES = [
  {
    icon: GraduationCap,
    title: "OJT",
    description: "Gain real-world experience.",
  },
  {
    icon: Briefcase,
    title: "Internships",
    description: "Develop your skills in a professional environment.",
  },
  {
    icon: Rocket,
    title: "Employment",
    description: "Take your next step toward your career.",
  },
];

const PARTNER_BENEFITS = [
  ["Reach Talent", "Connect directly with ASIATECH students."],
  [
    "Build Future Professionals",
    "Give students meaningful industry experience.",
  ],
  [
    "Simplify Recruitment",
    "Post opportunities and manage applicants through one platform.",
  ],
  [
    "Build a Stronger Partnership",
    "Strengthen the connection between education and industry.",
  ],
];

// DESKTOP image adjustments — edit each slide's `desktopClass` to nudge its image.
//   md:translate-x-4   → move right (use -x-4 for left)
//   md:translate-y-4   → move down  (use -y-4 for up)
//   md:scale-[1.8]     → size (bigger number = larger)
// Numbers: 2/4/6/8/10... each step ≈ 4px. These only affect desktop (md and up).
const ABOUT_SLIDES = [
  {
    image: "/system-logo/A-Sync-Logo.png",
    alt: "A-Sync official logo",
    name: "Connecting ASIATECH Students to the Industry",
    role: "AsiatechSync connects students with meaningful industry opportunities.",
    desktopClass: "md:translate-x-[50px]",
  },
  {
    image: "/system-logo/Igot.png",
    alt: "Romel S. Igot Jr.",
    name: "Romel S. Igot Jr.",
    role: "Front-end development and integration",
    desktopClass: "md:translate-y-2 md:scale-[1.7]",
  },
  {
    image: "/system-logo/Olivera.png",
    alt: "Leonor Olivera",
    name: "Leonor Olivera",
    role: "Back-end development and API integration",
    desktopClass: "md:translate-y-6 md:scale-[3.5]",
  },
  {
    image: "/system-logo/Mesa.png",
    alt: "Tyrone James Rafael A. Mesa",
    name: "Tyrone James Rafael A. Mesa",
    role: "Documentation and system development support",
    desktopClass: "md:translate-x-15 md:translate-y-4 md:scale-[1.7]",
  },
];

const LandingPage = ({ intro = false, onIntroComplete }) => {
  const { user } = useAuth();
  const heroVideoRef = useRef(null);
  const [shouldRenderHeroVideo] = useState(
    () => intro || hasHomeIntroPlayedThisSession(),
  );
  const [hasHeroIntro] = useState(intro);
  const [isIntroRevealed, setIsIntroRevealed] = useState(!intro);
  const [isIntroVideoPlaying, setIsIntroVideoPlaying] = useState(false);
  const [hasIntroVideoFailed, setHasIntroVideoFailed] = useState(false);
  const [concern, setConcern] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [concernStatus, setConcernStatus] = useState("");
  const [concernBusy, setConcernBusy] = useState(false);
  const [concernConsent, setConcernConsent] = useState(false);
  const [aboutSlide, setAboutSlide] = useState(0);
  const [aboutDirection, setAboutDirection] = useState(1);
  const [featureSlide, setFeatureSlide] = useState(0);
  const prefersReducedM2otion = useReducedMotion();

  const finishIntroVideo = useCallback(() => {
    setIsIntroRevealed(true);
    if (onIntroComplete) {
      onIntroComplete();
    }
  }, [onIntroComplete]);

  const ensureHeroVideoPlaying = useCallback(() => {
    const video = heroVideoRef.current;
    if (
      !shouldRenderHeroVideo ||
      prefersReducedMotion ||
      hasIntroVideoFailed ||
      document.visibilityState !== "visible" ||
      !video?.paused
    ) {
      return;
    }

    video.play().catch(() => setHasIntroVideoFailed(true));
  }, [hasIntroVideoFailed, prefersReducedMotion, shouldRenderHeroVideo]);

  React.useEffect(() => {
    if (!intro) return undefined;

    if (prefersReducedMotion || hasIntroVideoFailed) {
      finishIntroVideo();
      return undefined;
    }

    if (!isIntroVideoPlaying) return undefined;

    const revealTimeout = window.setTimeout(
      () => setIsIntroRevealed(true),
      INTRO_CONTENT_REVEAL_DELAY * 1000,
    );
    const completionTimeout = window.setTimeout(
      finishIntroVideo,
      INTRO_DURATION * 1000,
    );
    return () => {
      window.clearTimeout(revealTimeout);
      window.clearTimeout(completionTimeout);
    };
  }, [
    hasIntroVideoFailed,
    finishIntroVideo,
    intro,
    isIntroVideoPlaying,
    prefersReducedMotion,
  ]);

  React.useEffect(() => {
    if (
      !shouldRenderHeroVideo ||
      prefersReducedMotion ||
      hasIntroVideoFailed
    ) {
      return undefined;
    }

    document.addEventListener("visibilitychange", ensureHeroVideoPlaying);
    ensureHeroVideoPlaying();

    return () =>
      document.removeEventListener("visibilitychange", ensureHeroVideoPlaying);
  }, [ensureHeroVideoPlaying, hasIntroVideoFailed, prefersReducedMotion, shouldRenderHeroVideo]);

  const submitConcern = async (event) => {
    event.preventDefault();
    if (!concernConsent) {
      setConcernStatus("Please confirm you agree to the Privacy Policy first.");
      return;
    }
    setConcernBusy(true);
    setConcernStatus("");
    try {
      const { data } = await api.post("/contact/concerns", {
        name: user?.fullName || concern.name,
        email: user?.email || concern.email,
        message: concern.message,
      });
      setConcern({ name: "", email: "", message: "" });
      setConcernConsent(false);
      setConcernStatus(data.message);
      window.setTimeout(() => setConcernStatus(""), 5000);
    } catch (error) {
      setConcernStatus(
        error.response?.data?.message || "Unable to send your concern.",
      );
    } finally {
      setConcernBusy(false);
    }
  };

  const moveAboutSlide = (direction) => {
    setAboutDirection(direction);
    setAboutSlide(
      (current) =>
        (current + direction + ABOUT_SLIDES.length) % ABOUT_SLIDES.length,
    );
  };

  const aboutScrollRef = useRef(null);

  // Mobile About carousel: track which slide is centered while swiping
  const handleAboutScroll = () => {
    const el = aboutScrollRef.current;
    if (!el) return;
    const elLeft = el.getBoundingClientRect().left;
    const center = el.scrollLeft + el.clientWidth / 2;
    let active = 0;
    el.querySelectorAll("[data-about-slide]").forEach((slide, index) => {
      const rect = slide.getBoundingClientRect();
      const slideCenter = rect.left - elLeft + el.scrollLeft + rect.width / 2;
      if (slideCenter <= center) active = index;
    });
    if (active !== aboutSlide) setAboutSlide(active);
  };

  // Mobile dot tap: smooth-scroll the strip to that slide
  const scrollToAboutSlide = (index) => {
    setAboutDirection(index >= aboutSlide ? 1 : -1);
    setAboutSlide(index);
    const el = aboutScrollRef.current;
    const target = el?.querySelectorAll("[data-about-slide]")[index];
    target?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  };

  const moveFeatureSlide = (direction) => {
    setFeatureSlide(
      (current) => (current + direction + FEATURES.length) % FEATURES.length,
    );
  };

  return (
    <div className="min-h-screen bg-[#FBF8F3]">
      <section className="relative isolate overflow-hidden bg-white text-[#1D2939]">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-[#F8F6F2] to-[#F0EDE6]">
          <div
            className={`absolute inset-0 ${
              intro && isIntroVideoPlaying && !prefersReducedMotion
                ? "landing-intro-camera"
                : ""
            }`}
          >
            <img
              className="absolute inset-0 h-full w-full object-cover object-[50%_20%]"
              src="/media/hero-intro-still.webp"
              alt=""
              aria-hidden="true"
              fetchpriority="high"
              decoding="async"
            />
            {shouldRenderHeroVideo && !prefersReducedMotion && !hasIntroVideoFailed && (
              <video
                ref={heroVideoRef}
                className="landing-hero-video absolute inset-0 h-full w-full object-cover object-[50%_20%] transition-opacity duration-700 ease-out motion-reduce:transition-none"
                src="/media/hero-intro-2.mp4?v=6fd1a86a"
                poster="/media/hero-intro-still.webp"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                onCanPlay={ensureHeroVideoPlaying}
                onPlay={() => setIsIntroVideoPlaying(true)}
                onPlaying={() => setIsIntroVideoPlaying(true)}
                onError={() => setHasIntroVideoFailed(true)}
              />
            )}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/20" />
        </div>

        <div className="relative z-30">
          <Navbar variant="overlay" />
        </div>

        {intro && (
          <button
            type="button"
            onClick={finishIntroVideo}
            className="absolute bottom-6 right-5 z-20 rounded-full border border-[#D9DEE5] bg-white/90 px-5 py-2.5 text-sm font-semibold text-[#1D2939] shadow-md backdrop-blur-sm transition hover:bg-white lg:bottom-auto lg:top-24"
          >
            Skip intro
          </button>
        )}

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-20 lg:pt-12">
          <motion.div
            initial={intro ? { opacity: 0, y: 10 } : "hidden"}
            animate={
              intro
                ? {
                    opacity: isIntroRevealed ? 1 : 0,
                    y: isIntroRevealed ? 0 : 10,
                  }
                : "visible"
            }
            transition={
              hasHeroIntro
                ? {
                    duration: 1.05,
                    delay: intro && isIntroRevealed ? 0.16 : 0,
                    ease: [0.22, 1, 0.36, 1],
                  }
                : undefined
            }
            variants={heroContent}
            className="flex min-h-[480px] items-center justify-start sm:min-h-[560px]"
          >
            <div className="max-w-2xl text-left sm:max-w-3xl">
              <motion.p
                variants={heroItem}
                className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white [text-shadow:0_1px_14px_rgba(15,61,46,0.45)] sm:mb-5 sm:text-[11px] sm:tracking-[0.32em]"
              >
                Connecting Students. Empowering Opportunities.
              </motion.p>

              <motion.h1
                variants={heroItem}
                className="mb-5 font-bespoke text-[clamp(2.1rem,8vw,6rem)] font-bold italic leading-[0.96] tracking-[-0.04em] text-white [text-shadow:0_2px_24px_rgba(15,61,46,0.45)]"
              >
                Your Future Starts With the Right Opportunity.
              </motion.h1>

              <motion.p
                variants={heroItem}
                className="mb-8 max-w-2xl text-base leading-relaxed text-white/85 [text-shadow:0_1px_14px_rgba(15,61,46,0.4)] sm:text-lg"
              >
                AsiatechSync connects Asia Technological School of Science and Arts students with OJT, internship, and career opportunities from industry partners.
              </motion.p>

              <motion.div variants={heroItem} className="flex flex-row flex-wrap items-center gap-3">
                <a
                  href="/jobs"
                  className="inline-flex items-center justify-center rounded-full bg-[#E8C165] px-5 py-3 text-center text-xs font-bold text-[#0F3D2E] shadow-[0_14px_30px_rgba(232,193,101,0.38)] transition duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:bg-[#DEB24E] sm:px-7 sm:py-3.5 sm:text-sm"
                >
                  Find Opportunities
                </a>
                <button
                  type="button"
                  onClick={openPartnerSignup}
                  className="inline-flex items-center justify-center rounded-full border border-[#1E5D46]/30 bg-[#F0EDE6]/70 px-5 py-3 text-center text-xs font-bold text-[#0F3D2E] backdrop-blur-sm transition duration-200 hover:-translate-y-1 hover:bg-[#E6EFE6] sm:px-7 sm:py-3.5 sm:text-sm"
                >
                  Partner With Us
                </button>
              </motion.div>

              <motion.div
                variants={heroItem}
                className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white [text-shadow:0_1px_12px_rgba(15,61,46,0.4)] sm:mt-8 sm:gap-4 sm:text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-[#1E5D46]" />
                  Career-ready students
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-[#E8C165]" />
                  Industry partners
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section
        id="about"
        className="relative z-0 scroll-mt-24 overflow-hidden px-4 py-14 sm:px-8 sm:py-20 md:px-16 lg:px-20"
      >
        {/* Mobile: fixed "About ASIATECHSYNC" label on top-left; name -> image -> text scrolls left/right */}
        <div className="mx-auto max-w-6xl md:hidden">
          <p className="mb-4 text-left text-xs font-bold uppercase tracking-[0.2em] text-[#1E5D46]">
            About ASIATECHSYNC
          </p>
          <div
            ref={aboutScrollRef}
            onScroll={handleAboutScroll}
            className="homepage-mobile-carousel -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2"
          >
            {ABOUT_SLIDES.map((slide, index) => (
              <article
                key={slide.name}
                data-about-slide
                className="min-w-[85%] snap-center"
              >
                <h2 className="mb-3 break-words text-left text-[clamp(1.5rem,6.5vw,2rem)] font-extrabold leading-tight text-[#1D2939]">
                  {slide.name}
                </h2>
                <div className="relative mx-auto h-[220px] w-full max-w-[20rem] sm:h-[260px]">
                  <div className="flex h-full items-center justify-center">
                    <img
                      src={slide.image}
                      alt={slide.alt}
                      loading="lazy"
                      decoding="async"
                      className={`w-full object-contain ${
                        index === 0
                          ? "h-[200px] max-w-full scale-100 sm:h-60"
                          : index === 1 || index === 3
                            ? "h-[200px] max-w-full scale-100 sm:h-60 sm:scale-[1.6]"
                            : "h-[200px] max-w-full scale-100 sm:h-60 sm:translate-y-6 sm:scale-[1.45]"
                      }`}
                    />
                  </div>
                </div>
                <p className="mt-3 text-left text-base leading-relaxed text-[#4B5768]">
                  {slide.role}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-4 flex justify-center gap-1.5">
            {ABOUT_SLIDES.map((slide, index) => (
              <button
                key={slide.name}
                type="button"
                onClick={() => scrollToAboutSlide(index)}
                aria-label={`Show ${slide.name}`}
                aria-current={aboutSlide === index}
                className={`h-1.5 rounded-full transition-all ${
                  aboutSlide === index
                    ? "w-6 bg-[#E8C165]"
                    : "w-1.5 bg-[#1E5D46]/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Desktop: single-slide view with arrows (unchanged) */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          className="mx-auto hidden max-w-6xl md:block"
        >
          <motion.div
            key={aboutSlide}
            initial={
              prefersReducedMotion
                ? false
                : { opacity: 0, x: aboutDirection > 0 ? 80 : -80 }
            }
            animate={{ opacity: 1, x: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 150, damping: 25 }
            }
            className="grid min-w-0 gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center md:gap-10"
          >
            {aboutSlide % 2 === 0 && (
              <div className="min-w-0">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#1E5D46]">
                  About ASIATECHSYNC
                </p>
                <h2 className="mb-4 break-words text-[clamp(1.85rem,8vw,3rem)] font-extrabold leading-tight text-[#1D2939] md:mb-5 md:text-5xl">
                  {ABOUT_SLIDES[aboutSlide].name}
                </h2>
                <p className="mb-2 text-base leading-relaxed text-[#4B5768] sm:text-lg md:mb-7">
                  {ABOUT_SLIDES[aboutSlide].role}
                </p>
              </div>
            )}
            <div className="relative mx-auto grid h-[320px] min-h-0 w-full max-w-none grid-cols-1 items-center gap-0 py-3 md:absolute md:inset-0">
              <div className="relative h-full min-w-0 overflow-hidden md:absolute md:inset-0">
                <div className="flex h-full items-center justify-center">
                  <img
                    src={ABOUT_SLIDES[aboutSlide].image}
                    alt={ABOUT_SLIDES[aboutSlide].alt}
                    loading="lazy"
                    decoding="async"
                    className={`w-full rounded-2xl object-contain ${
                      aboutSlide === 0
                        ? "h-[220px] max-w-full scale-100 sm:h-72"
                        : aboutSlide === 1 || aboutSlide === 3
                          ? "h-[220px] max-w-full translate-y-0 scale-100 sm:h-72 sm:scale-[1.6]"
                          : "h-[220px] max-w-full translate-y-0 scale-100 sm:h-72 sm:translate-y-8 sm:scale-[1.45]"
                    } ${ABOUT_SLIDES[aboutSlide].desktopClass}`}
                  />
                </div>
                <div className="absolute bottom-1 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 sm:bottom-4">
                  {ABOUT_SLIDES.map((slide, index) => (
                    <button
                      key={slide.name}
                      type="button"
                      onClick={() => {
                        setAboutDirection(index >= aboutSlide ? 1 : -1);
                        setAboutSlide(index);
                      }}
                      aria-label={`Show ${slide.name}`}
                      aria-current={aboutSlide === index}
                      className={`h-1.5 rounded-full transition-all ${
                        aboutSlide === index
                          ? "w-6 bg-[#E8C165]"
                          : "w-1.5 bg-[#1E5D46]/30 hover:bg-[#1E5D46]/60"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            {aboutSlide % 2 === 1 && (
              <div className="min-w-0">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#1E5D46]">
                  About ASIATECHSYNC
                </p>
                <h2 className="mb-4 break-words text-[clamp(1.85rem,8vw,3rem)] font-extrabold leading-tight text-[#1D2939] md:mb-5 md:text-5xl">
                  {ABOUT_SLIDES[aboutSlide].name}
                </h2>
                <p className="mb-2 text-base leading-relaxed text-[#4B5768] sm:text-lg md:mb-7">
                  {ABOUT_SLIDES[aboutSlide].role}
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
        <button
          type="button"
          onClick={() => moveAboutSlide(-1)}
          aria-label="Previous AsiatechSync team member"
          className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#0F3D2E] shadow-md transition hover:bg-white hover:text-[#1E5D46] md:flex"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => moveAboutSlide(1)}
          aria-label="Next AsiatechSync team member"
          className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#0F3D2E] shadow-md transition hover:bg-white hover:text-[#1E5D46] md:flex"
        >
          <ChevronRight size={20} />
        </button>
      </section>

      {/* Commitment Section */}
      <section
        id="commitment"
        className="bg-[#0F3D2E] px-5 py-20 text-white sm:px-8 lg:px-12"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:items-center"
        >
          <div className="overflow-hidden rounded-[28px] border border-white/15 bg-white/10 p-4">
            <img
              src="/system-logo/Asiatech%20Seal.png"
              alt="ASIATECH school seal"
              loading="lazy"
              decoding="async"
              className="mx-auto h-56 w-full object-contain"
            />
          </div>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#E8C165]">
              The ASIATECH Commitment
            </p>
            <h2 className="mb-5 text-3xl font-extrabold md:text-5xl">
              A Commitment to Our Students
            </h2>
            <p className="text-lg leading-relaxed text-white/75">
              At Asia Technological School of Science and Arts, we believe that
              education should open doors to meaningful opportunities.
              AsiatechSync extends that commitment beyond the classroom by
              helping our students connect with the industry and prepare for
              their professional journey.
            </p>
          </div>
        </motion.div>
      </section>

      {/* How ASIATECHSYNC Works Section */}
      <section className="px-5 py-20 sm:px-8 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="mx-auto max-w-6xl"
        >
          <motion.div variants={fadeUp} className="mb-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#1E5D46]">
              How ASIATECHSYNC Works
            </p>
            <h2 className="text-3xl font-extrabold text-[#1D2939] md:text-5xl">
              A simple path to your next step.
            </h2>
          </motion.div>

          <div className="homepage-mobile-carousel -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-4 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.number}
                  variants={fadeUp}
                  whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="min-w-[80%] snap-center flex h-full flex-col rounded-2xl border border-[#ECE7DD] bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md md:min-w-0"
                >
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EAF3EA] text-[#1E5D46]">
                      <Icon size={22} />
                    </span>
                    <p className="text-sm font-black text-[#E8C165]">
                      {feature.number}
                    </p>
                  </div>

                  <h3 className="mb-3 text-xl font-bold text-[#1D2939]">
                    {feature.title}
                  </h3>
                  <p className="text-[#4B5768]">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* Student Testimonials Section */}
      <section className="bg-[#E6EFE6] px-5 py-20 sm:px-8 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="mx-auto max-w-6xl"
        >
          <motion.p
            variants={fadeUp}
            className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#1E5D46]"
          >
            Student Experience
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mb-10 text-3xl font-extrabold text-[#1D2939] md:text-5xl"
          >
            Hear From Our Students
          </motion.h2>
          <div className="homepage-mobile-carousel -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-4 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-0">
            {[
              {
                quote:
                  "Before using AsiatechSync, I wasn't sure where to start looking for internship opportunities. The platform made everything easier by showing opportunities that matched my interests.",
                attribution: "BS Information Technology Student",
              },
              {
                quote:
                  "What I liked most about AsiatechSync was having everything in one place. I could explore opportunities, review company information, and submit applications without jumping between websites.",
                attribution: "OJT Student",
              },
              {
                quote:
                  "AsiatechSync gave me access to opportunities I might not have found on my own. Through the platform, I connected with an industry partner that allowed me to apply what I learned in the classroom.",
                attribution: "Internship Applicant",
              },
            ].map((testimonial) => (
              <motion.div
                key={testimonial.attribution}
                variants={fadeUp}
                whileHover={
                  prefersReducedMotion ? undefined : { y: -7, scale: 1.02 }
                }
                className="min-w-[84%] snap-center rounded-2xl border border-white/60 bg-white/45 p-7 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white/60 md:min-w-0"
              >
                <p className="mb-8 text-[#4B5768]">"{testimonial.quote}"</p>
                <p className="text-sm font-bold text-[#1E5D46]">
                  — {testimonial.attribution}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Opportunities Section */}
      <section id="opportunities" className="px-5 py-20 sm:px-8 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="mx-auto max-w-6xl"
        >
          <motion.div
            variants={fadeUp}
            className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end"
          >
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#1E5D46]">
                Explore Your Path
              </p>
              <h2 className="text-3xl font-extrabold text-[#1D2939] md:text-5xl">
                Opportunities Are Waiting
              </h2>
            </div>
            <a
              href="/jobs"
              className="inline-flex items-center gap-2 font-bold text-[#1E5D46]"
            >
              Explore Opportunities <ArrowRight size={17} />
            </a>
          </motion.div>
          <div className="homepage-mobile-carousel -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-4 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0">
            {OPPORTUNITIES.map((opportunity) => {
              const Icon = opportunity.icon;
              return (
                <motion.div
                  key={opportunity.title}
                  variants={fadeUp}
                  whileHover={
                    prefersReducedMotion ? undefined : { y: -7, scale: 1.02 }
                  }
                  className="min-w-[84%] snap-center rounded-2xl border border-[#ECE7DD] bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md md:min-w-0"
                >
                  <Icon className="mb-6 text-[#1E5D46]" size={32} />
                  <h3 className="mb-2 text-xl font-bold text-[#1D2939]">
                    {opportunity.title}
                  </h3>
                  <p className="text-[#4B5768]">{opportunity.description}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* Partners Section */}
      <section
        id="partners"
        className="bg-[#0F3D2E] px-5 py-20 text-white sm:px-8 lg:px-12"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          className="mx-auto max-w-6xl"
        >
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#E8C165]">
              For Our Industry Partners
            </p>
            <h2 className="mb-5 text-3xl font-extrabold md:text-5xl">
              Partner With ASIATECH
            </h2>
            <p className="mb-3 text-xl text-white/90">
              Your company can help shape the next generation of professionals.
            </p>
            <p className="mb-8 text-lg leading-relaxed text-white/70">
              Connect with motivated ASIATECH students and discover potential
              OJT trainees, interns, and future employees through AsiatechSync.
            </p>
            <button
              type="button"
              onClick={openPartnerSignup}
              className="inline-flex items-center gap-2 rounded-full bg-[#E8C165] px-7 py-3.5 font-bold text-[#0F3D2E] transition duration-200 hover:-translate-y-1 hover:scale-[1.03] hover:bg-[#DEB24E] hover:shadow-md"
            >
              Become a Partner <ArrowRight size={17} />
            </button>
          </div>
        </motion.div>
      </section>

      {/* Why Partner With Us Section */}
      <section className="px-5 py-20 sm:px-8 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="mx-auto max-w-6xl"
        >
          <motion.div variants={fadeUp} className="mb-10">
            <h2 className="text-3xl font-extrabold text-[#1D2939] md:text-5xl">
              Why Partner With Us?
            </h2>
          </motion.div>
          <div className="homepage-mobile-carousel -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-4 md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0">
            {PARTNER_BENEFITS.map(([title, description]) => (
              <motion.div
                variants={fadeUp}
                key={title}
                whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="min-w-[80%] snap-center flex gap-4 rounded-2xl border border-[#ECE7DD] bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md md:min-w-0"
              >
                <CheckCircle
                  className="mt-1 shrink-0 text-[#1E5D46]"
                  size={23}
                />
                <div>
                  <h3 className="mb-2 text-xl font-bold text-[#1D2939]">
                    {title}
                  </h3>
                  <p className="text-[#4B5768]">{description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* About School Section */}
      <section id="school" className="bg-[#E6EFE6] px-5 py-20 sm:px-8 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-center"
        >
          <div className="flex justify-center rounded-[28px] bg-white/45 p-8">
            <img
              src="/system-logo/Asiatech%20Seal.png"
              alt="ASIATECH school seal"
              loading="lazy"
              decoding="async"
              className="h-44 w-full object-contain"
            />
          </div>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#1E5D46]">
              About ASIATECH
            </p>
            <h2 className="mb-5 text-3xl font-extrabold text-[#1D2939] md:text-5xl">
              About Asia Technological School of Science and Arts
            </h2>
            <p className="mb-6 text-lg leading-relaxed text-[#4B5768]">
              Asia Technological School of Science and Arts is the institution
              behind AsiatechSync, supporting students in their academic journey
              and preparing them for opportunities beyond the classroom.
            </p>
            <div className="space-y-3 text-[#1D2939]">
              <a
                className="flex items-center gap-2 font-bold text-[#1E5D46]"
                href="https://asiatech.edu.ph"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={16} /> Official ASIATECH Website
              </a>
              <a
                className="flex items-center gap-2 font-bold text-[#1E5D46]"
                href="https://www.facebook.com/ASIATECHOfficial"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={16} /> ASIATECH Official Facebook
              </a>
              <p className="flex items-start gap-2">
                <MapPin className="mt-1 shrink-0 text-[#1E5D46]" size={17} />
                1506 National Highway, Brgy. Dila, City of Santa Rosa, Laguna,
                Philippines
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="px-5 py-24 sm:px-8 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          className="mx-auto max-w-4xl text-center"
        >
          <h2 className="mb-5 text-3xl font-extrabold text-[#1D2939] md:text-5xl">
            Your Next Opportunity Starts Here.
          </h2>
          <p className="mx-auto mb-9 max-w-2xl text-lg leading-relaxed text-[#4B5768]">
            Whether you're a student looking for your next opportunity or a
            company looking for future talent, AsiatechSync is here to connect
            you.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="/jobs"
              className="rounded-full bg-[#E8C165] px-7 py-3.5 font-bold text-[#0F3D2E] transition duration-200 hover:-translate-y-1 hover:scale-[1.03] hover:bg-[#DEB24E] hover:shadow-md"
            >
              Find Opportunities
            </a>
            <button
              type="button"
              onClick={openPartnerSignup}
              className="rounded-full border-2 border-[#1E5D46] px-7 py-3.5 font-bold text-[#1E5D46] transition duration-200 hover:-translate-y-1 hover:scale-[1.03] hover:bg-[#1E5D46]/5 hover:shadow-md"
            >
              Become a Partner
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer
        id="contact"
        className="scroll-mt-24 bg-[#0F3D2E] px-5 py-14 text-white sm:px-8 lg:px-12"
      >
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-4">
          <div>
            <p className="mb-3 text-xl font-black">ASIATECHSYNC</p>
            <p className="text-white/70">
              Connecting Students. Empowering Opportunities. Building Futures.
            </p>
          </div>
          <div>
            <p className="mb-4 font-bold">Quick Links</p>
            <div className="grid grid-cols-2 gap-3 text-sm text-white/70">
              <a href="#about">About Us</a>
              <Link to="/jobs">Opportunities</Link>
              <a href="#opportunities">Student Experiences</a>
              <a href="#partners">For Companies</a>
              <a href="#contact">Contact</a>
            </div>
          </div>
          <div>
            <p className="mb-4 font-bold">Contact Us</p>
            <a
              className="mb-3 block text-sm text-white/70"
              href="mailto:asiatechsync@gmail.com"
            >
              asiatechsync@gmail.com
            </a>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-white">
              Website
            </p>
            <a
              className="mb-4 block text-sm text-white/70"
              href="https://asiatech.edu.ph"
              target="_blank"
              rel="noreferrer"
            >
              Official ASIATECH Website
            </a>
            <a
              className="mb-3 block text-sm text-white/70"
              href="https://www.facebook.com/ASIATECHOfficial"
              target="_blank"
              rel="noreferrer"
            >
              <span className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-white">
                Facebook
              </span>
              Official ASIATECH Facebook
            </a>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-white">
              Address
            </p>
            <p className="flex items-start gap-2 text-sm text-white/70">
              <MapPin className="mt-1 shrink-0" size={15} />
              1506 National Highway, Brgy. Dila, City of Santa Rosa, Laguna,
              Philippines
            </p>
          </div>
          <div>
            <p className="mb-2 font-bold">Send a Concern</p>
            <p className="mb-4 text-xs text-white/70">
              Send your concern directly to the admin office.
            </p>
            <form onSubmit={submitConcern} className="space-y-2">
              {user ? (
                <p className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white/80">
                  Sending as {user.fullName} ({user.email})
                </p>
              ) : (
                <>
                  <input
                    required
                    type="text"
                    minLength={2}
                    maxLength={160}
                    className="w-full rounded-lg px-3 py-2 text-sm text-navy"
                    placeholder="Your name"
                    value={concern.name}
                    onChange={(event) =>
                      setConcern({ ...concern, name: event.target.value })
                    }
                  />
                  <input
                    required
                    type="email"
                    className="w-full rounded-lg px-3 py-2 text-sm text-navy"
                    placeholder="Your email address"
                    value={concern.email}
                    onChange={(event) =>
                      setConcern({ ...concern, email: event.target.value })
                    }
                  />
                </>
              )}
              <textarea
                required
                minLength={10}
                maxLength={3000}
                className="min-h-24 w-full rounded-lg px-3 py-2 text-sm text-navy"
                placeholder="Your concern"
                value={concern.message}
                onChange={(event) =>
                  setConcern({ ...concern, message: event.target.value })
                }
              />
              <button
                disabled={concernBusy}
                className="w-full rounded-lg bg-[#E8C165] px-3 py-2 text-xs font-bold text-[#0F3D2E]"
              >
                {concernBusy ? "Sending..." : "Send concern"}
              </button>
              <label className="flex items-start gap-2 text-[11px] text-white/70">
                <input
                  type="checkbox"
                  required
                  checked={concernConsent}
                  onChange={(event) => setConcernConsent(event.target.checked)}
                  className="mt-0.5"
                />
                <span>I agree to the site's privacy and legal terms.</span>
              </label>
              {concernStatus && (
                <p className="text-xs text-white/80">{concernStatus}</p>
              )}
            </form>
          </div>
        </div>
        <p className="mx-auto mt-12 max-w-6xl border-t border-white/15 pt-6 text-sm text-white/65">
          © 2026 ASIATECH SYNC. Connecting talent with opportunity.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
