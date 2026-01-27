import "./SaveTheDate.css";
import { useEffect, useRef } from "react";

export default function SaveTheDate() {
  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    let animationFrame;

    const speed = 0.5; // smaller = slower

    const scroll = () => {
      el.scrollTop += speed;

      // When we reach half the scroll height → reset
      if (el.scrollTop >= el.scrollHeight / 2) {
        el.scrollTop = 0;
      }

      animationFrame = requestAnimationFrame(scroll);
    };

    animationFrame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationFrame);
  }, []);
  // const photos = [
  //   "/photo1.png",
  //   "/photo2.png",
  //   "/photo3.png",
  //   "/photo3.png",
  //   "/photo5.png",
  //   "/photo3.png",
  //   "/photo7.png",
  //   "/photo3.png",
  //   "/photo3.png",
  //   "/photo2.png",
  //   "/photo3.png",
  //   "/photo4.png",
  //   "/photo3.png",
  //   "/photo6.png",
  //   "/photo7.png",
  //   "/photo8.png",
  //   "/photo7.png",
  //   "/photo8.png",
  //   "/photo8.png",
  //   "/photo7.png",
  //   "/photo8.png",
  // ];
  function importAll(r) {
    return r.keys().map(r);
  }

  const photos = importAll(
    require.context("../../public/photos", false, /\.(png|jpe?g)$/),
  );
  return (
    <div className="std-page">
      <div className="std-bg" aria-hidden="true" ref={scrollRef}>
        <div className="std-grid">
          {[...photos, ...photos].map((src, i) => (
            <img key={i} className="std-img" src={src} alt="" />
          ))}
        </div>
      </div>

      <div className="std-overlay">
        <div className="std-top">
          <div className="std-script">A decade of love,</div>
          <div className="std-title">A LIFETIME TO GO!</div>
        </div>

        <div className="std-center">
          <div className="std-names">Anthony &amp; Perla</div>

          <div className="std-logo">
            <img className="std-logo-img" src="/logo.png" />
          </div>

          <div className="std-since">Since 2016</div>
        </div>

        <div className="std-bottom">
          <div className="std-save">SAVE THE DATE</div>
          <div className="std-date">25.07.26</div>
        </div>
      </div>
    </div>
  );
}
