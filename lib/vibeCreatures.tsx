"use client";
import { VibeTypeIndex } from "@/lib/types";

type CreatureProps = { size: number };

function Architect({ size }: CreatureProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ag" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#18162e"/>
          <stop offset="100%" stopColor="#080810" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="200" height="200" fill="url(#ag)"/>
      <line x1="20" y1="60" x2="55" y2="60" stroke="#7F77DD" strokeWidth="0.5" opacity="0.2"/>
      <line x1="55" y1="60" x2="55" y2="40" stroke="#7F77DD" strokeWidth="0.5" opacity="0.2"/>
      <circle cx="55" cy="40" r="2" fill="#7F77DD" opacity="0.4"/>
      <line x1="145" y1="80" x2="180" y2="80" stroke="#7F77DD" strokeWidth="0.5" opacity="0.2"/>
      <line x1="145" y1="80" x2="145" y2="55" stroke="#7F77DD" strokeWidth="0.5" opacity="0.2"/>
      <circle cx="145" cy="55" r="2" fill="#7F77DD" opacity="0.4"/>
      <polygon points="100,58 125,80 125,130 100,145 75,130 75,80" fill="#7F77DD" opacity="0.1"/>
      <polygon points="100,60 123,81 123,128 100,143 77,128 77,81" fill="none" stroke="#7F77DD" strokeWidth="1" opacity="0.3"/>
      <polygon points="78,80 68,55 90,72" fill="#7F77DD" opacity="0.22"/>
      <polygon points="122,80 132,55 110,72" fill="#7F77DD" opacity="0.22"/>
      <path d="M77 105 Q55 95 48 115 Q65 120 77 115 Z" fill="#7F77DD" opacity="0.12"/>
      <path d="M123 105 Q145 95 152 115 Q135 120 123 115 Z" fill="#7F77DD" opacity="0.12"/>
      <ellipse cx="100" cy="98" rx="27" ry="30" fill="#0d0d2a"/>
      <ellipse cx="100" cy="98" rx="27" ry="30" fill="none" stroke="#7F77DD" strokeWidth="1.5" opacity="0.9"/>
      <line x1="73" y1="90" x2="127" y2="90" stroke="#7F77DD" strokeWidth="0.4" opacity="0.3"/>
      <line x1="73" y1="98" x2="127" y2="98" stroke="#7F77DD" strokeWidth="0.4" opacity="0.3"/>
      <line x1="73" y1="106" x2="127" y2="106" stroke="#7F77DD" strokeWidth="0.4" opacity="0.3"/>
      <line x1="85" y1="68" x2="85" y2="128" stroke="#7F77DD" strokeWidth="0.4" opacity="0.2"/>
      <line x1="100" y1="68" x2="100" y2="128" stroke="#7F77DD" strokeWidth="0.4" opacity="0.2"/>
      <line x1="115" y1="68" x2="115" y2="128" stroke="#7F77DD" strokeWidth="0.4" opacity="0.2"/>
      <rect x="84" y="85" width="10" height="10" fill="none" stroke="#7F77DD" strokeWidth="1.5" rx="1"/>
      <rect x="106" y="85" width="10" height="10" fill="none" stroke="#7F77DD" strokeWidth="1.5" rx="1"/>
      <rect x="87" y="88" width="4" height="4" fill="#7F77DD" opacity="0.8"/>
      <rect x="109" y="88" width="4" height="4" fill="#7F77DD" opacity="0.8"/>
    </svg>
  );
}

function Degen({ size }: CreatureProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="dg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e1008"/>
          <stop offset="100%" stopColor="#080810" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="200" height="200" fill="url(#dg)"/>
      <rect x="0" y="35" width="200" height="2" fill="#D85A30" opacity="0.08"/>
      <rect x="0" y="78" width="200" height="1" fill="#D85A30" opacity="0.06"/>
      <rect x="0" y="130" width="200" height="2" fill="#D85A30" opacity="0.07"/>
      <path d="M72 145 L72 105 Q72 80 100 78 Q128 80 128 105 L128 145 Q114 140 100 142 Q86 140 72 145Z" fill="#D85A30" opacity="0.15"/>
      <polygon points="80,82 65,45 95,75" fill="#D85A30" opacity="0.5"/>
      <polygon points="120,82 135,45 105,75" fill="#D85A30" opacity="0.5"/>
      <polygon points="82,80 69,50 93,74" fill="#1e1008" opacity="0.5"/>
      <polygon points="118,80 131,50 107,74" fill="#1e1008" opacity="0.5"/>
      <path d="M128 130 Q155 110 160 130 Q155 150 135 145 Z" fill="#D85A30" opacity="0.18"/>
      <rect x="74" y="82" width="52" height="50" rx="4" fill="#0d0808"/>
      <rect x="74" y="82" width="52" height="50" rx="4" fill="none" stroke="#D85A30" strokeWidth="1.5" opacity="0.9"/>
      <rect x="82" y="92" width="14" height="10" fill="#D85A30" opacity="0.9"/>
      <rect x="85" y="95" width="5" height="5" fill="#080810"/>
      <rect x="104" y="92" width="14" height="10" fill="#D85A30" opacity="0.9"/>
      <rect x="107" y="95" width="5" height="5" fill="#080810"/>
      <line x1="74" y1="103" x2="86" y2="103" stroke="#ff6a3d" strokeWidth="1.5" opacity="0.5"/>
      <line x1="114" y1="108" x2="126" y2="108" stroke="#ff6a3d" strokeWidth="1.5" opacity="0.5"/>
    </svg>
  );
}

function Ghost({ size }: CreatureProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="gg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a1a2a"/>
          <stop offset="100%" stopColor="#080810" stopOpacity="0"/>
        </radialGradient>
        <filter id="gblur">
          <feGaussianBlur stdDeviation="3"/>
        </filter>
      </defs>
      <rect width="200" height="200" fill="url(#gg)"/>
      <circle cx="30" cy="40" r="2" fill="#888780" opacity="0.3" filter="url(#gblur)"/>
      <circle cx="170" cy="60" r="1.5" fill="#888780" opacity="0.25"/>
      <circle cx="50" cy="160" r="1" fill="#888780" opacity="0.2"/>
      <circle cx="155" cy="150" r="2.5" fill="#888780" opacity="0.2" filter="url(#gblur)"/>
      <path d="M68 152 Q68 168 77 163 Q87 158 97 163 Q107 168 117 163 Q127 158 132 163 Q132 150 132 142 L132 96 Q132 63 100 61 Q68 63 68 96 Z" fill="#888780" opacity="0.18"/>
      <path d="M68 150 Q75 162 82 150 Q89 138 96 150 Q103 162 110 150 Q117 138 124 150 Q128 157 132 150" fill="none" stroke="#888780" strokeWidth="1.5" opacity="0.4"/>
      <ellipse cx="100" cy="95" rx="26" ry="32" fill="#d0cfc8" opacity="0.9"/>
      <ellipse cx="100" cy="95" rx="26" ry="32" fill="none" stroke="#888780" strokeWidth="1" opacity="0.5"/>
      <ellipse cx="91" cy="90" rx="5" ry="6" fill="#080810"/>
      <ellipse cx="109" cy="90" rx="5" ry="6" fill="#080810"/>
      <line x1="96" y1="106" x2="104" y2="106" stroke="#080810" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function Builder({ size }: CreatureProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg3" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#081a12"/>
          <stop offset="100%" stopColor="#080810" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="200" height="200" fill="url(#bg3)"/>
      <line x1="25" y1="50" x2="25" y2="170" stroke="#1D9E75" strokeWidth="0.5" opacity="0.2"/>
      <line x1="175" y1="50" x2="175" y2="170" stroke="#1D9E75" strokeWidth="0.5" opacity="0.2"/>
      <line x1="25" y1="80" x2="55" y2="80" stroke="#1D9E75" strokeWidth="0.5" opacity="0.2"/>
      <line x1="145" y1="80" x2="175" y2="80" stroke="#1D9E75" strokeWidth="0.5" opacity="0.2"/>
      <ellipse cx="100" cy="118" rx="32" ry="28" fill="#1D9E75" opacity="0.12"/>
      <circle cx="78" cy="78" r="12" fill="#1D9E75" opacity="0.2"/>
      <circle cx="122" cy="78" r="12" fill="#1D9E75" opacity="0.2"/>
      <ellipse cx="100" cy="84" rx="30" ry="8" fill="#1D9E75" opacity="0.7"/>
      <rect x="72" y="76" width="56" height="10" rx="5" fill="#1D9E75" opacity="0.8"/>
      <rect x="68" y="83" width="64" height="5" rx="2" fill="#1D9E75" opacity="0.5"/>
      <rect x="74" y="88" width="52" height="38" rx="6" fill="#061208"/>
      <rect x="74" y="88" width="52" height="38" rx="6" fill="none" stroke="#1D9E75" strokeWidth="1.5" opacity="0.9"/>
      <line x1="76" y1="95" x2="124" y2="95" stroke="#1D9E75" strokeWidth="0.5" opacity="0.2"/>
      <line x1="76" y1="100" x2="124" y2="100" stroke="#1D9E75" strokeWidth="0.5" opacity="0.2"/>
      <line x1="76" y1="105" x2="124" y2="105" stroke="#1D9E75" strokeWidth="0.5" opacity="0.15"/>
      <path d="M80 92 Q95 88 100 92" stroke="#1D9E75" strokeWidth="1" fill="none" opacity="0.5"/>
      <rect x="95" y="99" width="10" height="12" fill="#1D9E75" opacity="0.6" rx="1"/>
    </svg>
  );
}

function WhaleHunter({ size }: CreatureProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="wg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#050f1a"/>
          <stop offset="100%" stopColor="#080810" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="200" height="200" fill="url(#wg)"/>
      <circle cx="35" cy="155" r="3" fill="none" stroke="#185FA5" strokeWidth="0.8" opacity="0.3"/>
      <circle cx="42" cy="135" r="2" fill="none" stroke="#185FA5" strokeWidth="0.8" opacity="0.25"/>
      <circle cx="165" cy="148" r="2.5" fill="none" stroke="#185FA5" strokeWidth="0.8" opacity="0.3"/>
      <ellipse cx="100" cy="160" rx="60" ry="8" fill="none" stroke="#185FA5" strokeWidth="0.5" opacity="0.15"/>
      <ellipse cx="100" cy="115" rx="35" ry="28" fill="#185FA5" opacity="0.12"/>
      <path d="M100 75 Q112 55 108 40" stroke="#185FA5" strokeWidth="1.5" fill="none" opacity="0.6"/>
      <circle cx="108" cy="39" r="5" fill="#185FA5" opacity="0.8"/>
      <circle cx="108" cy="39" r="3" fill="#4da6ff" opacity="0.9"/>
      <ellipse cx="100" cy="100" rx="28" ry="24" fill="#050f1a"/>
      <ellipse cx="100" cy="100" rx="28" ry="24" fill="none" stroke="#185FA5" strokeWidth="2" opacity="0.9"/>
      <circle cx="88" cy="96" r="9" fill="#185FA5" opacity="0.12"/>
      <circle cx="88" cy="96" r="9" fill="none" stroke="#185FA5" strokeWidth="1.5"/>
      <circle cx="112" cy="96" r="9" fill="#185FA5" opacity="0.12"/>
      <circle cx="112" cy="96" r="9" fill="none" stroke="#185FA5" strokeWidth="1.5"/>
      <path d="M83 91 Q87 88 91 91" stroke="#4da6ff" strokeWidth="0.8" fill="none" opacity="0.5"/>
      <path d="M107 91 Q111 88 115 91" stroke="#4da6ff" strokeWidth="0.8" fill="none" opacity="0.5"/>
      <path d="M128 100 Q140 95 145 100" stroke="#185FA5" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round"/>
    </svg>
  );
}

function Socialite({ size }: CreatureProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a0810"/>
          <stop offset="100%" stopColor="#080810" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="200" height="200" fill="url(#sg)"/>
      <circle cx="40" cy="45" r="1.5" fill="#D4537E" opacity="0.6"/>
      <circle cx="160" cy="40" r="1" fill="#D4537E" opacity="0.5"/>
      <circle cx="170" cy="155" r="1.5" fill="#D4537E" opacity="0.4"/>
      <circle cx="30" cy="150" r="1" fill="#D4537E" opacity="0.5"/>
      <path d="M100 95 Q70 60 45 70 Q30 80 40 105 Q55 125 100 115 Z" fill="#D4537E" opacity="0.16"/>
      <path d="M100 95 Q130 60 155 70 Q170 80 160 105 Q145 125 100 115 Z" fill="#D4537E" opacity="0.16"/>
      <path d="M100 95 Q70 60 45 70 Q30 80 40 105 Q55 125 100 115 Z" fill="none" stroke="#D4537E" strokeWidth="1" opacity="0.4"/>
      <path d="M100 95 Q130 60 155 70 Q170 80 160 105 Q145 125 100 115 Z" fill="none" stroke="#D4537E" strokeWidth="1" opacity="0.4"/>
      <path d="M100 112 Q75 120 60 140 Q75 145 100 130 Z" fill="#D4537E" opacity="0.1"/>
      <path d="M100 112 Q125 120 140 140 Q125 145 100 130 Z" fill="#D4537E" opacity="0.1"/>
      <path d="M72 90 Q72 75 100 75 Q128 75 128 90 L128 110 Q118 118 100 118 Q82 118 72 110 Z" fill="#1a0810"/>
      <path d="M72 90 Q72 75 100 75 Q128 75 128 90 L128 110 Q118 118 100 118 Q82 118 72 110 Z" fill="none" stroke="#D4537E" strokeWidth="1.5" opacity="0.9"/>
      <path d="M78 90 Q86 82 96 88 Q86 96 78 90 Z" fill="none" stroke="#D4537E" strokeWidth="1.2"/>
      <path d="M78 90 Q86 82 96 88 Q86 96 78 90 Z" fill="#D4537E" opacity="0.12"/>
      <path d="M104 88 Q114 82 122 90 Q114 96 104 88 Z" fill="none" stroke="#D4537E" strokeWidth="1.2"/>
      <path d="M104 88 Q114 82 122 90 Q114 96 104 88 Z" fill="#D4537E" opacity="0.12"/>
      <path d="M72 90 Q60 78 55 68" stroke="#D4537E" strokeWidth="1.5" fill="none" opacity="0.6" strokeLinecap="round"/>
      <circle cx="54" cy="67" r="3" fill="#D4537E" opacity="0.5"/>
      <path d="M92 110 Q100 115 108 110" stroke="#D4537E" strokeWidth="1" fill="none" opacity="0.6"/>
    </svg>
  );
}

function Oracle({ size }: CreatureProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="og" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#181005"/>
          <stop offset="100%" stopColor="#080810" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="oeye" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffcc44" stopOpacity="0.9"/>
          <stop offset="60%" stopColor="#BA7517" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#BA7517" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="200" height="200" fill="url(#og)"/>
      <line x1="30" y1="30" x2="170" y2="170" stroke="#BA7517" strokeWidth="0.3" opacity="0.1"/>
      <line x1="170" y1="30" x2="30" y2="170" stroke="#BA7517" strokeWidth="0.3" opacity="0.1"/>
      <path d="M100 90 Q72 72 50 80 Q35 90 45 115 Q60 128 100 118 Z" fill="#BA7517" opacity="0.18"/>
      <path d="M100 90 Q128 72 150 80 Q165 90 155 115 Q140 128 100 118 Z" fill="#BA7517" opacity="0.18"/>
      <path d="M100 90 Q72 72 50 80 Q35 90 45 115 Q60 128 100 118 Z" fill="none" stroke="#BA7517" strokeWidth="0.8" opacity="0.45"/>
      <path d="M100 90 Q128 72 150 80 Q165 90 155 115 Q140 128 100 118 Z" fill="none" stroke="#BA7517" strokeWidth="0.8" opacity="0.45"/>
      <path d="M100 95 Q85 82 65 85" stroke="#BA7517" strokeWidth="0.5" fill="none" opacity="0.3"/>
      <path d="M100 95 Q115 82 135 85" stroke="#BA7517" strokeWidth="0.5" fill="none" opacity="0.3"/>
      <polygon points="100,118 93,130 107,130" fill="#BA7517" opacity="0.35"/>
      <ellipse cx="100" cy="96" rx="28" ry="22" fill="#0d0808"/>
      <ellipse cx="100" cy="96" rx="28" ry="22" fill="none" stroke="#BA7517" strokeWidth="1.5" opacity="0.9"/>
      <polygon points="100,74 88,86 112,86" fill="#BA7517" opacity="0.12"/>
      <polygon points="100,74 88,86 112,86" fill="none" stroke="#BA7517" strokeWidth="0.8" opacity="0.4"/>
      <ellipse cx="100" cy="97" rx="14" ry="10" fill="url(#oeye)" opacity="0.8"/>
      <ellipse cx="100" cy="97" rx="14" ry="10" fill="none" stroke="#BA7517" strokeWidth="1"/>
      <circle cx="100" cy="97" r="7" fill="#080810"/>
      <circle cx="100" cy="97" r="5" fill="#BA7517" opacity="0.5"/>
      <circle cx="100" cy="97" r="2.5" fill="#ffcc44" opacity="0.9"/>
      <line x1="86" y1="97" x2="72" y2="97" stroke="#BA7517" strokeWidth="0.5" opacity="0.4"/>
      <line x1="114" y1="97" x2="128" y2="97" stroke="#BA7517" strokeWidth="0.5" opacity="0.4"/>
      <line x1="100" y1="83" x2="100" y2="75" stroke="#BA7517" strokeWidth="0.5" opacity="0.4"/>
    </svg>
  );
}

export const VIBE_CREATURES: Record<VibeTypeIndex, React.FC<CreatureProps>> = {
  0: Architect,
  1: Degen,
  2: Ghost,
  3: Builder,
  4: WhaleHunter,
  5: Socialite,
  6: Oracle,
};
