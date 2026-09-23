import { useMemo, useState } from "react";
import { CircleDollarSign, Download, Printer, ReceiptText } from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  PageHeader,
  Panel,
} from "../components/ui";
import { useHospital } from "../context/HospitalContext";
import { useI18n } from "../i18n";
import { useUi } from "../context/UiContext";
import { downloadXlsx } from "../utils/exportXlsx";
import { useAuth } from "../context/AuthContext";
import { printCurrentView } from "../utils/printDocument";

export function FinanceReportsPage() {
  const { t, language } = useI18n();
  const { invoices, patientName } = useHospital();
  const { toast } = useUi();
  const { can } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [method, setMethod] = useState("");
  const [source, setSource] = useState("");
  const filtered = useMemo(
    () =>
      invoices.filter((item) => {
        const date = item.date.slice(0, 10);
        return (
          (!from || date >= from) &&
          (!to || date <= to) &&
          (!method || item.paymentMethod === method) &&
          (!source || item.transferDetails?.source === source)
        );
      }),
    [invoices, from, to, method, source],
  );
  const total = filtered.reduce((sum, item) => sum + item.payableAmount, 0);
  const cash = filtered
    .filter((item) => item.paymentMethod === "cash")
    .reduce((sum, item) => sum + item.payableAmount, 0);
  const transfers = total - cash;
  const exportExcel = async () => {
    await downloadXlsx(
      `wafaa-finance-${new Date().toISOString().slice(0, 10)}.xlsx`,
      [
        t("receipt"),
        t("patientName"),
        t("service"),
        t("paid"),
        t("paymentMethod"),
        t("senderName"),
        t("senderPhone"),
        t("date"),
      ],
      filtered.map((item) => [
        item.receiptNumber,
        patientName(item.patientId),
        item.service,
        item.payableAmount,
        item.paymentMethod === "cash" ? t("cash") : t("appTransfer"),
        item.transferDetails?.senderName || "—",
        item.transferDetails?.senderPhone || "—",
        item.date.slice(0, 10),
      ]),
      language === "ar",
    );
    toast(t("excelGenerated"));
  };
  return (
    <>
      <PageHeader
        crumb={t("treasury")}
        title={t("financialReports")}
        sub={t("financialReportsSub")}
        actions={
          <>
            {can('finance.export')&&<Button className="btn-ghost" onClick={exportExcel}>
              <Download />
              {t("generateExcel")}
            </Button>}
            {can('finance.print')&&<Button className="btn-primary" onClick={() => void printCurrentView()}>
              <Printer />
              {t("printReport")}
            </Button>}
          </>
        }
      />
      <div className="finance-kpis">
        <article className="glass">
          <CircleDollarSign />
          <span>
            {t("totalCollections")}
            <b>{total.toFixed(2)} ₪</b>
          </span>
        </article>
        <article className="glass">
          <ReceiptText />
          <span>
            {t("cashCollections")}
            <b>{cash.toFixed(2)} ₪</b>
          </span>
        </article>
        <article className="glass">
          <ReceiptText />
          <span>
            {t("transferCollections")}
            <b>{transfers.toFixed(2)} ₪</b>
          </span>
        </article>
      </div>
      <Panel className="finance-filters">
        <div className="form-grid">
          <Field label={t("fromDate")}>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label={t("toDate")}>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
          <Field label={t("paymentMethod")}>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="">{t("all")}</option>
              <option value="cash">{t("cash")}</option>
              <option value="app">{t("appTransfer")}</option>
            </select>
          </Field>
          <Field label={t("transferSource")}>
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">{t("all")}</option>
              <option value="wallet">{t("wallet")}</option>
              <option value="bank">{t("bank")}</option>
              <option value="jawwalPay">{t("jawwalPay")}</option>
            </select>
          </Field>
        </div>
      </Panel>
      <Panel className="financial-report-print">
        <div className="panel-head">
          <h3>
            <ReceiptText />
            {t("financialTransactions")}
          </h3>
          <Badge color="emerald">{filtered.length}</Badge>
        </div>
        {filtered.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("receipt")}</th>
                  <th>{t("patientName")}</th>
                  <th>{t("service")}</th>
                  <th>{t("paid")}</th>
                  <th>{t("paymentMethod")}</th>
                  <th>{t("senderName")}</th>
                  <th>{t("senderPhone")}</th>
                  <th>{t("date")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered
                  .slice()
                  .reverse()
                  .map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Badge color="violet">{item.receiptNumber}</Badge>
                      </td>
                      <td>
                        <b>{patientName(item.patientId)}</b>
                      </td>
                      <td>{item.service}</td>
                      <td className="green">
                        {item.payableAmount.toFixed(2)} ₪
                      </td>
                      <td>
                        {item.paymentMethod === "cash"
                          ? t("cash")
                          : `${t("appTransfer")} · ${t(item.transferDetails?.source || "app")}`}
                      </td>
                      <td>{item.transferDetails?.senderName || "—"}</td>
                      <td dir="ltr">
                        {item.transferDetails?.senderPhone || "—"}
                      </td>
                      <td>{item.date.slice(0, 10)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={t("noFinancialTransactions")}
            sub={t("adjustFinanceFilters")}
          />
        )}
      </Panel>
    </>
  );
}
