import { Link } from "react-router-dom";
import { IoFastFoodOutline } from "react-icons/io5";
import { brandName } from "../config";

interface BrandLogoProps {
  link?: boolean;
  compact?: boolean;
  className?: string;
}

const LogoContent = ({ compact = false }: { compact?: boolean }) => (
  <span className="inline-flex items-center gap-2.5">
    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-[0_8px_24px_rgba(249,115,22,0.25)]">
      <IoFastFoodOutline className="h-5 w-5" />
    </span>
    {!compact && (
      <span className="text-xl font-extrabold tracking-[-0.04em] text-slate-100">
        {brandName.slice(0, 5)}
        <span className="text-orange-500">{brandName.slice(5)}</span>
      </span>
    )}
  </span>
);

const BrandLogo = ({ link = true, compact = false, className = "" }: BrandLogoProps) => {
  if (!link) {
    return (
      <span className={className} aria-label={brandName}>
        <LogoContent compact={compact} />
      </span>
    );
  }

  return (
    <Link to="/" className={className} aria-label={`${brandName} home`}>
      <LogoContent compact={compact} />
    </Link>
  );
};

export default BrandLogo;
