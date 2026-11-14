import React, { useState } from 'react';
import { Candidate } from '../types';

export const KpuLogoSvg: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Logo Komisi Pemilihan Umum"
  >
    {/* Outer official red-gold ring */}
    <circle cx="60" cy="60" r="56" fill="#FFFFFF" stroke="#B91C1C" strokeWidth="4" />
    <circle cx="60" cy="60" r="49" fill="#FFFBEB" stroke="#D97706" strokeWidth="2" />
    {/* Ballot box */}
    <rect x="33" y="54" width="54" height="36" rx="4" fill="#DC2626" stroke="#7F1D1D" strokeWidth="2.5" />
    <rect x="30" y="48" width="60" height="10" rx="3" fill="#B91C1C" stroke="#7F1D1D" strokeWidth="2" />
    {/* Ballot slot */}
    <rect x="46" y="51" width="28" height="3.5" rx="1.5" fill="#FEF2F2" />
    {/* Ballot paper entering box */}
    <path
      d="M48 25H72V51H48V25Z"
      fill="#FFFFFF"
      stroke="#0F172A"
      strokeWidth="2.2"
    />
    {/* Checkmark / Coblos mark on ballot */}
    <path
      d="M54 38L58.5 42.5L67 33"
      stroke="#DC2626"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Bottom ribbon */}
    <rect x="26" y="83" width="68" height="15" rx="7.5" fill="#0F172A" />
    <text
      x="60"
      y="93.5"
      textAnchor="middle"
      fill="#FFFFFF"
      fontSize="9.5"
      fontWeight="800"
      fontFamily="Plus Jakarta Sans, sans-serif"
      letterSpacing="1.5"
    >
      KPU DESA
    </text>
  </svg>
);

export const BlankoBallotSvg: React.FC<{ className?: string; selected?: boolean }> = ({
  className = 'w-14 h-14',
  selected = false,
}) => (
  <svg
    viewBox="0 0 96 96"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Ilustrasi Calon Blanko"
  >
    <rect
      x="8"
      y="8"
      width="80"
      height="80"
      rx="10"
      fill={selected ? '#FEF2F2' : '#F8FAFC'}
      stroke={selected ? '#DC2626' : '#64748B'}
      strokeWidth="3"
      strokeDasharray="6 4"
    />
    <rect x="22" y="20" width="52" height="44" rx="4" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="2" />
    <path d="M32 32H64M32 42H64M32 52H52" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
    {selected && (
      <path
        d="M36 30L60 54M60 30L36 54"
        stroke="#DC2626"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    )}
    <text
      x="48"
      y="79"
      textAnchor="middle"
      fill={selected ? '#B91C1C' : '#475569'}
      fontSize="10"
      fontWeight="700"
      fontFamily="Plus Jakarta Sans, sans-serif"
    >
      BLANKO
    </text>
  </svg>
);

const CandidateOnePortraitSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 300 400"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Foto Calon 1 Udin Jamaludin"
  >
    {/* Bright Yellow Studio Background matching Calon 3 */}
    <rect width="300" height="400" fill="#FFE600" />
    {/* Subtle studio vignette */}
    <radialGradient id="c1_bg" cx="50%" cy="42%" r="60%">
      <stop offset="0%" stopColor="#FFF24D" stopOpacity="0.8" />
      <stop offset="100%" stopColor="#F5C400" stopOpacity="0.4" />
    </radialGradient>
    <rect width="300" height="400" fill="url(#c1_bg)" />

    {/* Shoulders & White Official PDH Shirt */}
    <path
      d="M25 400C32 315 72 284 150 284C228 284 268 315 275 400H25Z"
      fill="#F8FAFC"
      stroke="#CBD5E1"
      strokeWidth="2"
    />
    {/* Shirt placket & pockets */}
    <path d="M150 296V400" stroke="#CBD5E1" strokeWidth="2.5" />
    <rect x="74" y="340" width="44" height="48" rx="4" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2" />
    <rect x="182" y="340" width="44" height="48" rx="4" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2" />
    {/* Collar */}
    <path d="M116 286L150 326L184 286" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="2" />
    {/* Neck */}
    <path d="M126 244H174V294C174 304 162 312 150 312C138 312 126 304 126 294V244Z" fill="#D99B72" />
    {/* Ears */}
    <ellipse cx="95" cy="182" rx="11" ry="20" fill="#D18F65" />
    <ellipse cx="205" cy="182" rx="11" ry="20" fill="#D18F65" />
    {/* Face */}
    <path
      d="M98 148C98 108 120 90 150 90C180 90 202 108 202 148V192C202 232 178 260 150 260C122 260 98 232 98 192V148Z"
      fill="#E2A87E"
    />
    {/* Hair sides */}
    <path d="M96 158C96 132 104 114 114 106V146L98 164L96 158Z" fill="#1E293B" />
    <path d="M204 158C204 132 196 114 186 106V146L202 164L204 158Z" fill="#1E293B" />
    {/* Traditional Black Peci Cap */}
    <path
      d="M98 126C98 92 114 68 150 68C186 68 202 92 202 126C184 121 168 119 150 119C132 119 116 121 98 126Z"
      fill="#0F172A"
    />
    <path d="M100 123C118 118 134 116 150 116C166 116 182 118 200 123" stroke="#334155" strokeWidth="2" />
    {/* Eyebrows */}
    <path d="M116 156C124 151 134 151 141 155" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
    <path d="M159 155C166 151 176 151 184 156" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
    {/* Eyes */}
    <ellipse cx="129" cy="170" rx="7" ry="4.5" fill="#FFFFFF" />
    <circle cx="129" cy="170" r="3.5" fill="#1E293B" />
    <ellipse cx="171" cy="170" rx="7" ry="4.5" fill="#FFFFFF" />
    <circle cx="171" cy="170" r="3.5" fill="#1E293B" />
    {/* Nose */}
    <path d="M150 168V198C150 202 144 205 140 204" stroke="#B67650" strokeWidth="3" strokeLinecap="round" />
    {/* Neat mustache & warm smile */}
    <path d="M132 215C140 210 160 210 168 215" stroke="#1E293B" strokeWidth="4.5" strokeLinecap="round" />
    <path d="M135 224C144 231 156 231 165 224" stroke="#7C2D12" strokeWidth="3" strokeLinecap="round" />
    {/* Garuda badge pin on chest */}
    <circle cx="198" cy="322" r="7" fill="#D97706" stroke="#FEF08A" strokeWidth="1.5" />
  </svg>
);

const CandidateTwoPortraitSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 300 400"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Foto Calon 2 Carmin"
  >
    {/* Bright Yellow Studio Background matching Calon 3 */}
    <rect width="300" height="400" fill="#FFE600" />
    <radialGradient id="c2_bg" cx="50%" cy="42%" r="60%">
      <stop offset="0%" stopColor="#FFF24D" stopOpacity="0.8" />
      <stop offset="100%" stopColor="#F5C400" stopOpacity="0.4" />
    </radialGradient>
    <rect width="300" height="400" fill="url(#c2_bg)" />

    {/* Shoulders & Dark Navy Formal Batik / Jas */}
    <path
      d="M25 400C32 315 72 284 150 284C228 284 268 315 275 400H25Z"
      fill="#1E3A8A"
      stroke="#172554"
      strokeWidth="2"
    />
    {/* Subtle geometric batik motif lines */}
    <path
      d="M70 330L92 352L70 374M110 330L132 352L110 374M190 330L168 352L190 374M230 330L208 352L230 374"
      stroke="#93C5FD"
      strokeOpacity="0.35"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Inner white collar & tie */}
    <path d="M118 285L150 342L182 285H118Z" fill="#FFFFFF" />
    <path d="M144 300L150 308L156 300L154 360L150 370L146 360L144 300Z" fill="#B91C1C" />
    {/* Neck */}
    <path d="M126 244H174V294C174 304 162 312 150 312C138 312 126 304 126 294V244Z" fill="#CE8E63" />
    {/* Ears */}
    <ellipse cx="95" cy="182" rx="11" ry="20" fill="#C48358" />
    <ellipse cx="205" cy="182" rx="11" ry="20" fill="#C48358" />
    {/* Face */}
    <path
      d="M98 148C98 108 120 88 150 88C180 88 202 108 202 148V192C202 232 178 260 150 260C122 260 98 232 98 192V148Z"
      fill="#DC9F75"
    />
    {/* Neat parted hair */}
    <path
      d="M96 156C93 114 112 72 152 72C190 72 206 106 204 156C200 132 188 114 166 112C146 110 122 118 106 132C102 138 99 148 96 156Z"
      fill="#0F172A"
    />
    {/* Eyebrows */}
    <path d="M116 156C124 152 134 152 141 156" stroke="#1E293B" strokeWidth="3.8" strokeLinecap="round" />
    <path d="M159 156C166 152 176 152 184 156" stroke="#1E293B" strokeWidth="3.8" strokeLinecap="round" />
    {/* Eyes */}
    <ellipse cx="129" cy="171" rx="7" ry="4.5" fill="#FFFFFF" />
    <circle cx="129" cy="171" r="3.5" fill="#1E293B" />
    <ellipse cx="171" cy="171" rx="7" ry="4.5" fill="#FFFFFF" />
    <circle cx="171" cy="171" r="3.5" fill="#1E293B" />
    {/* Nose */}
    <path d="M150 168V198C150 202 145 205 141 204" stroke="#AA6A44" strokeWidth="3" strokeLinecap="round" />
    {/* Confident smile */}
    <path d="M132 219C143 229 157 229 168 219" stroke="#7C2D12" strokeWidth="3.2" strokeLinecap="round" />
  </svg>
);

interface CandidatePhotoProps {
  candidate: Candidate;
  className?: string;
}

export const CandidatePhoto: React.FC<CandidatePhotoProps> = ({
  candidate,
  className = 'w-full h-full object-cover',
}) => {
  const [imgError, setImgError] = useState(false);

  if (candidate.photoUrl && !imgError) {
    return (
      <img
        src={candidate.photoUrl}
        alt={`Foto Calon Nomor ${candidate.nomorUrut} - ${candidate.namaLengkap}`}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={className}
      />
    );
  }

  if (candidate.photoType === 'preset_1' || candidate.nomorUrut === 1) {
    return <CandidateOnePortraitSvg className={className} />;
  }

  if (candidate.photoType === 'preset_2' || candidate.nomorUrut === 2) {
    return <CandidateTwoPortraitSvg className={className} />;
  }

  return (
    <div className="w-full h-full bg-amber-300 flex flex-col items-center justify-center p-4 text-slate-900">
      <span className="text-4xl font-bold font-display">No. {candidate.nomorUrut}</span>
      <span className="text-sm font-semibold text-center mt-2">{candidate.namaLengkap}</span>
    </div>
  );
};
