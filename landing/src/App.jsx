import React from "react";
import { Button } from "./components/ui/button";
import "@fontsource/inter";

export default function LandingPage() {
  return (
    <div className="bg-[#FAE9D1] text-[#2C1E1E] font-inter min-h-screen">
      {/* Hero Section */}

       <div className="absolute inset-0 w-full h-full -z-10">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FFE0B2] to-[#FF9800]"></div>

      {/* Scattered Circles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, index) => (
          <div
            key={`circle-${index}`}
            className="absolute rounded-full bg-[#FFF3E0] opacity-10"
            style={{
              width: `${Math.random() * 50 + 10}px`,
              height: `${Math.random() * 50 + 10}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              transform: `translate(-50%, -50%)`,
              filter: 'blur(2px)',
            }}
          ></div>
        ))}
      </div>

      {/* Scattered Hexagons */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, index) => (
          <div
            key={`hexagon-${index}`}
            className="absolute bg-[#FFF3E0] opacity-10"
            style={{
              width: `${Math.random() * 40 + 15}px`,
              height: `${Math.random() * 40 + 15}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              transform: `translate(-50%, -50%) rotate(${Math.random() * 360}deg) clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);`,
              filter: 'blur(2px)',
            }}
          ></div>
        ))}
      </div>

      {/* Scattered Currency Symbols */}
      <div className="absolute inset-0 pointer-events-none text-[#FFF3E0] opacity-10">
        {['$', '₿', '$', '₿', '$'].map((symbol, index) => (
          <span
            key={`currency-${index}`}
            className="absolute text-xl font-bold"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              transform: `translate(-50%, -50%) rotate(${Math.random() * 360}deg)`,
              filter: 'blur(1px)',
            }}
          >
            {symbol}
          </span>
        ))}
      </div>

      
    </div>


    
      <section className="bg-gradient-to-br from-[#F95C1E] to-[#763D8B] text-white px-6 py-20 text-center min-h-[100vh]">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">
            Buy & Sell Crypto with Just <span className="text-[#FFE9C6]">SMS</span> or <span className="text-[#FFE9C6]">USSD</span>.
          </h1>
          <p className="text-lg mb-8 text-[#FFE9C6]">
            No app. No internet. Just your phone. Crypto made for you.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button className="bg-[#FFE9C6] text-black px-6 py-3 font-semibold rounded-xl hover:opacity-90">
              Get Started via SMS
            </Button>
            <button className="underline text-[#FFE9C6] text-base">Learn How it Works</button>
          </div>
        </div>
      </section>



      {/* How It Works */}
      <section className="py-16 px-6 bg-[#FAE9D1] text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold mb-10">How It Works</h2>
        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          <div className="flex flex-col items-center">
            <div className="bg-[#FFD395] rounded-2xl p-6 mb-4 w-24 h-24 flex items-center justify-center">
              <span className="text-3xl">📱</span>
            </div>
            <p className="font-medium">Dial a short code</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-[#FFD395] rounded-2xl p-6 mb-4 w-24 h-24 flex items-center justify-center">
              <span className="text-3xl">📋</span>
            </div>
            <p className="font-medium">Choose Buy or Sell</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-[#FFD395] rounded-2xl p-6 mb-4 w-24 h-24 flex items-center justify-center">
              <span className="text-3xl">✅</span>
            </div>
            <p className="font-medium">Confirm & Get Crypto</p>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 px-6 bg-[#FFF6EA]">
        <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-10">Why Choose Us</h2>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 max-w-5xl mx-auto text-left">
          {[
            "Internet-Free Access",
            "Supports All Mobile Networks",
            "Fast Payouts to Mobile Money",
            "Safe & encrypted Transactions",
            "Multi-Currency Support (BTC, USDT)",
            "Designed for African Markets"
          ].map((feature, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <span className="text-green-600 text-xl mt-1">✔</span>
              <p className="font-medium text-base leading-snug">{feature}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-6 bg-[#FFE9C6] text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold mb-6">
          Ready to join the easiest crypto gateway in Africa?
        </h2>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button className="bg-[#F95C1E] text-white px-6 py-3 font-semibold rounded-xl hover:opacity-90">
            Start Now via SMS
          </Button>
          <Button variant="outline" className="border-black text-black px-6 py-3 font-semibold rounded-xl">
            Chat with Support on WhatsApp
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2C1E1E] text-white py-8 px-4 text-center">
        <p className="text-sm">© 2025 CryptoLink. Built in Africa, for Africans 🇿🇦🇳🇬🇰🇪🇬🇭</p>
      </footer>
    </div>
  );
}
