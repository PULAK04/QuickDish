import { useNavigate, useParams } from "react-router-dom";
import { BiCheckCircle } from "react-icons/bi";

const PaymentSuccess = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();

  return <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-12 sm:px-6">
    <div className="cm-card w-full p-7 text-center sm:p-9">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/10"><BiCheckCircle className="h-12 w-12 text-emerald-500" /></div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">Payment verified</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-100">Your craving is on its way.</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">The restaurant has received your QuickDish order. You can follow each status update from the orders page.</p>
      {paymentId && <div className="mt-5 rounded-2xl bg-[#11161d] p-3"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Payment ID</p><p className="mt-1 break-all font-mono text-xs text-slate-400">{paymentId}</p></div>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><button className="cm-secondary" onClick={() => navigate("/")}>Order more</button><button className="cm-primary" onClick={() => navigate("/orders")}>Track order</button></div>
    </div>
  </main>;
};

export default PaymentSuccess;
