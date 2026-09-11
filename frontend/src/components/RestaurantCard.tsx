import { useNavigate } from "react-router-dom";
import { BiMapPin, BiTimeFive } from "react-icons/bi";
import { HiArrowUpRight } from "react-icons/hi2";

interface RestaurantCardProps {
  id: string;
  image: string;
  name: string;
  distance: string;
  isOpen: boolean;
  description?: string;
}

const RestaurantCard = ({
  id,
  image,
  name,
  distance,
  isOpen,
  description,
}: RestaurantCardProps) => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="group overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#171c24] text-left shadow-[0_12px_34px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_18px_42px_rgba(249,115,22,0.12)]"
      onClick={() => navigate(`/restaurant/${id}`)}
    >
      <div className="relative h-44 w-full overflow-hidden bg-[#1c232d] sm:h-48">
        {image ? (
          <img
            src={image}
            alt={name}
            loading="lazy"
            className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
              !isOpen ? "grayscale" : ""
            }`}
          />
        ) : (
          <div className="grid h-full place-items-center bg-gradient-to-br from-orange-50 to-rose-50 text-sm font-semibold text-orange-500">
            QuickDish Restaurant
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm ${
            isOpen
              ? "bg-emerald-500/100 text-white"
              : "bg-[#0b0f15]/85 text-white"
          }`}
        >
          {isOpen ? "Open now" : "Closed"}
        </span>
        <span className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-[#1a2029]/95 text-slate-300 shadow-lg transition group-hover:text-orange-600">
          <HiArrowUpRight className="h-4 w-4" />
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 truncate text-base font-extrabold tracking-tight text-slate-100 sm:text-lg">
            {name}
          </h3>
          <span className="shrink-0 rounded-lg bg-orange-500/10 px-2 py-1 text-xs font-bold text-orange-700">
            Verified partner
          </span>
        </div>

        <p className="mt-1 line-clamp-1 min-h-5 text-sm text-slate-400">
          {description || "Fresh favourites, prepared for your next craving"}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 pt-3 text-xs font-medium text-slate-400">
          <span className="inline-flex items-center gap-1">
            <BiMapPin className="text-orange-500" /> {distance} km
          </span>
          <span className="inline-flex items-center gap-1">
            <BiTimeFive className="text-orange-500" /> 25–35 min
          </span>
        </div>
      </div>
    </button>
  );
};

export default RestaurantCard;
