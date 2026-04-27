from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import Optional
import pymssql
import os

DB_SERVER   = "SPXDB"
DB_DATABASE = "spartaxx"

app = FastAPI(title="Hearing Accounts API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    import win32com.client as win32
    import pythoncom
    WIN32_AVAILABLE = True
except ImportError:
    WIN32_AVAILABLE = False
    return pymssql.connect(server=DB_SERVER, database=DB_DATABASE)


@app.get("/")
def root():
    DIST_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")
    index = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index):
        return FileResponse(index)
    return {"message": "Hearing Accounts API is running"}


def build_extra_filters(
    county, start_date, end_date,
    hearing_resolution_id, protest_code, protest_reason,
    hearing_finalized, hearing_status, coded_status, aofa_status,
    account_number=None, owner_name=None, property_address=None
):
    extra_filters = ""

    if county:
        extra_filters += f" AND c.Countyname = '{county}'"
    if start_date:
        extra_filters += f" AND CAST(hd.FormalHearingDate AS DATE) >= '{start_date}'"
    if end_date:
        extra_filters += f" AND CAST(hd.FormalHearingDate AS DATE) <= '{end_date}'"
    if hearing_resolution_id:
        ids = [i.strip() for i in hearing_resolution_id.split(",") if i.strip()]
        has_blank = "(blank)" in ids
        real_ids = [i for i in ids if i != "(blank)"]
        if has_blank and real_ids:
            id_list = ",".join(f"'{i}'" for i in real_ids)
            extra_filters += f" AND (hr.HearingResolutionId IS NULL OR CAST(hr.HearingResolutionId AS VARCHAR) IN ({id_list}))"
        elif has_blank:
            extra_filters += " AND hr.HearingResolutionId IS NULL"
        elif real_ids:
            id_list = ",".join(f"'{i}'" for i in real_ids)
            extra_filters += f" AND CAST(hr.HearingResolutionId AS VARCHAR) IN ({id_list})"
    if protest_code:
        codes = [c.strip() for c in protest_code.split(",") if c.strip()]
        has_blank = "(blank)" in codes
        real_codes = [c for c in codes if c != "(blank)"]
        if has_blank and real_codes:
            code_list = ",".join(f"'{c}'" for c in real_codes)
            extra_filters += f" AND (pc.ProtestCodeValues IS NULL OR pc.ProtestCodeValues IN ({code_list}))"
        elif has_blank:
            extra_filters += " AND pc.ProtestCodeValues IS NULL"
        elif real_codes:
            code_list = ",".join(f"'{c}'" for c in real_codes)
            extra_filters += f" AND pc.ProtestCodeValues IN ({code_list})"
    if protest_reason == "(blank)":
        extra_filters += " AND pr.ProtestReason IS NULL"
    elif protest_reason:
        extra_filters += f" AND pr.ProtestReason = '{protest_reason}'"
    if hearing_finalized == "true":
        extra_filters += " AND hr.HearingFinalized = 1"
    elif hearing_finalized == "false":
        extra_filters += " AND hr.HearingFinalized IS NOT NULL AND hr.HearingFinalized = 0"
    if hearing_status == "(blank)":
        extra_filters += " AND hrs.HearingStatus IS NULL"
    elif hearing_status:
        extra_filters += f" AND hrs.HearingStatus = '{hearing_status}'"
    if coded_status:
        cs_list = [v.strip() for v in coded_status.split(",") if v.strip()]
        cs_parts = []
        if "Coded"     in cs_list: cs_parts.append("aof.DateCoded IS NOT NULL")
        if "Not Coded" in cs_list: cs_parts.append("aof.DateCoded IS NULL")
        if cs_parts:
            extra_filters += f" AND ({' OR '.join(cs_parts)})"
    if aofa_status:
        as_list = [v.strip() for v in aofa_status.split(",") if v.strip()]
        as_parts = []
        if "Valid A of A" in as_list: as_parts.append("aof.ExpiryDate >= GETDATE()")
        if "Expired"      in as_list: as_parts.append("aof.ExpiryDate < GETDATE()")
        if "No A of A"    in as_list: as_parts.append("aof.ReceivedDate IS NULL")
        if as_parts:
            extra_filters += f" AND ({' OR '.join(as_parts)})"

    if account_number:
        acc = account_number.strip().replace("'", "''")
        extra_filters += f" AND a.accountnumber LIKE '%{acc}%'"
    if owner_name:
        name = owner_name.strip().replace("'", "''")
        extra_filters += f" AND p.CADLegalName LIKE '%{name}%'"
    if property_address:
        addr = property_address.strip().replace("'", "''")
        extra_filters += f" AND ad.addressline1 LIKE '%{addr}%'"

    return extra_filters


def build_shared_cte(extra_filters):
    return f"""
    ;WITH DedupedHearingResult AS (
        SELECT *
        FROM (
            SELECT *,
                ROW_NUMBER() OVER (
                    PARTITION BY HearingDetailsId
                    ORDER BY
                        ISNULL(UpdatedDateTime, '1900-01-01') DESC,
                        HearingResultId DESC
                ) AS rn
            FROM ptax_hearingresult WITH (NOLOCK)
        ) hr_ranked
        WHERE rn = 1
    ),
    DedupedAccount AS (
        SELECT *
        FROM (
            SELECT
                a.*,
                p.IsUdiAccount,
                ROW_NUMBER() OVER (
                    PARTITION BY a.AccountNumber, hd.HearingDetailsId, p.CountyId
                    ORDER BY
                        CASE
                            WHEN p.IsUdiAccount = 1 THEN 0
                            WHEN p.IsUdiAccount = 0 THEN 1
                            ELSE 2
                        END,
                        ISNULL(a.UpdatedDateTime, '1900-01-01') DESC,
                        a.AccountId DESC
                ) AS row_rank
            FROM ptax_account a WITH (NOLOCK)
            INNER JOIN ptax_yearlyhearingdetails b WITH (NOLOCK)
                ON b.accountid = a.accountid AND b.TaxYear = 2026
            LEFT JOIN ptax_propertydetails p WITH (NOLOCK)
                ON p.propertydetailsid = b.propertyDetailsId
            LEFT JOIN ptax_hearingdetails hd WITH (NOLOCK)
                ON hd.YearlyHearingDetailsId = b.YearlyHearingDetailsId
        ) ranked
        WHERE row_rank = 1
    ),
    FinalResult AS (
        SELECT
            p.IsUdiAccount,
            c.Countyid,
            c.Countyname,
            cl.ClientStatus,
            a.accountnumber,
            p.CADLegalName,
            ad.addressline1 AS [Acc.property address],
            ad.cityid,
            ad.zipcode,
            a.StartDate,
            a.EndDate,
            f.clientnumber,
            e.OCALUC,
            NeighbourhoodCode,
            hr.completionDateAndTime,
            a.accountstatusid,
            s.Accountstatus,
            vn.NoticedDate,
            ht.HearingType,
            hr.HearingResolutionId,
            pc.ProtestCodeValues,
            pr.ProtestReason,
            hr.HearingFinalized,
            hrs.HearingStatus,
            hd.InformalHearingDate,
            hd.FormalHearingDate,
            CADEvidenceLetterDate,
            CADEvidenceScanDate,
            CADUEValue,
            CADMarketMeanValue,
            CADMarketMedianValue,
            OfferDate,
            OfferValue,
            vn.NoticeMarketValue,
            vn.NoticeTotalValue,
            hr.PostHearingMarketValue,
            hr.PostHearingTotalValue,
            aof.ReceivedDate,
            aof.ExpiryDate,
            aof.DateCoded,
            aof.OriginalDateCoded,
            aof.DateCodedEnd,
            CASE WHEN aof.DateCoded IS NOT NULL THEN 'Coded' ELSE 'Not Coded' END AS CodedStatus,
            CASE
                WHEN aof.ReceivedDate IS NULL THEN 'No A of A'
                WHEN aof.ExpiryDate >= GETDATE() THEN 'Valid A of A'
                ELSE 'Expired'
            END AS AofAStatus,
            a.accountnumber      AS case_id,
            hd.FormalHearingDate AS hearing_date,
            c.Countyname         AS county,
            hrs.HearingStatus    AS status,
            p.CADLegalName       AS plaintiff,
            f.clientnumber       AS defendant
        FROM DedupedAccount a
        LEFT JOIN ptax_client f WITH (NOLOCK) ON f.clientid = a.clientid
        LEFT JOIN ptax_clientstatus cl WITH (NOLOCK) ON cl.clientstatusid = f.ClientStatusId
        LEFT JOIN PTAX_AofA aof WITH (NOLOCK) ON aof.ClientId = a.clientid AND aof.AccountId = a.AccountId
        LEFT JOIN ptax_yearlyhearingdetails b WITH (NOLOCK) ON b.accountid = a.accountid AND b.TaxYear = 2026
        LEFT JOIN ptax_valuenotice vn WITH (NOLOCK) ON vn.ValueNoticeId = b.ValueNoticeId
        LEFT JOIN ptax_county c WITH (NOLOCK) ON c.countyid = a.countyid
        LEFT JOIN ptax_propertydetails p WITH (NOLOCK) ON p.propertydetailsid = b.propertyDetailsId
        LEFT JOIN ptax_address ad WITH (NOLOCK) ON ad.addressid = p.propertyaddressid
        LEFT JOIN ptax_hearingdetails hd WITH (NOLOCK) ON hd.YearlyHearingDetailsId = b.YearlyHearingDetailsId
        LEFT JOIN ptax_luc e WITH (NOLOCK) ON e.LUCId = p.lucid
        LEFT JOIN ptax_accountstatus s WITH (NOLOCK) ON s.Accountstatusid = a.accountstatusid
        LEFT JOIN DedupedHearingResult hr ON hr.HearingDetailsId = hd.HearingDetailsId
        LEFT JOIN ptax_hearingstatus hrs WITH (NOLOCK) ON hrs.HearingStatusId = hr.HearingStatusId
        LEFT JOIN ptax_hearingtype ht WITH (NOLOCK) ON ht.hearingtypeid = hd.HearingTypeId
        LEFT JOIN PTAX_ProtestDetails pd WITH (NOLOCK) ON b.ProtestingDetailsId = pd.ProtestDetailsId
        LEFT JOIN PTAX_ProtestCodeValues pc WITH (NOLOCK) ON pc.ProtestCodeValueId = ISNULL(pd.ProtestCodeId, 12)
        LEFT JOIN PTAX_Protestreason pr WITH (NOLOCK) ON pr.ProtestReasonId = pd.ProtestReasonId
        WHERE
            hd.HearingTypeId = 1
            AND a.accountstatusid IN (1, 4, 5)
            AND c.StateId = '44'
            AND (cl.clientstatus IS NULL OR cl.clientstatus NOT LIKE '%Test Client%')
            {extra_filters}
    )
    """


@app.get("/hearings")
def get_hearings(
    county: Optional[str]                = Query(None),
    start_date: Optional[str]            = Query(None),
    end_date: Optional[str]              = Query(None),
    hearing_resolution_id: Optional[str] = Query(None),
    protest_code: Optional[str]          = Query(None),
    protest_reason: Optional[str]        = Query(None),
    hearing_finalized: Optional[str]     = Query(None),
    hearing_status: Optional[str]        = Query(None),
    coded_status: Optional[str]          = Query(None),
    aofa_status: Optional[str]           = Query(None),
    account_number: Optional[str]        = Query(None),
    owner_name: Optional[str]            = Query(None),
    property_address: Optional[str]      = Query(None),
    page: int                            = Query(1, ge=1),
    page_size: int                       = Query(100, ge=1, le=500),
):
    conn = get_conn()
    cursor = conn.cursor(as_dict=True)

    extra_filters = build_extra_filters(
        county, start_date, end_date,
        hearing_resolution_id, protest_code, protest_reason,
        hearing_finalized, hearing_status, coded_status, aofa_status,
        account_number, owner_name, property_address
    )

    offset = (page - 1) * page_size
    shared_cte = build_shared_cte(extra_filters)

    # Count query
    count_query = shared_cte + """
    SELECT COUNT(*) AS total
    FROM (
        SELECT *,
            ROW_NUMBER() OVER (
                PARTITION BY accountnumber, CountyId
                ORDER BY
                    CASE
                        WHEN IsUdiAccount = 1 THEN 0
                        WHEN IsUdiAccount IS NULL THEN 2
                        ELSE 1
                    END
            ) AS rn
        FROM FinalResult
    ) deduped
    WHERE rn = 1
    """

    cursor.execute(count_query)
    total_count = cursor.fetchone()["total"]

    # Data query with pagination
    data_query = shared_cte + f"""
    SELECT *
    FROM (
        SELECT *,
            ROW_NUMBER() OVER (
                PARTITION BY accountnumber, CountyId
                ORDER BY
                    CASE
                        WHEN IsUdiAccount = 1 THEN 0
                        WHEN IsUdiAccount IS NULL THEN 2
                        ELSE 1
                    END
            ) AS rn
        FROM FinalResult
    ) deduped
    WHERE rn = 1
    ORDER BY FormalHearingDate DESC
    OFFSET {offset} ROWS
    FETCH NEXT {page_size} ROWS ONLY
    """

    cursor.execute(data_query)
    rows = cursor.fetchall()
    conn.close()

    return {
        "data": rows,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": -(-total_count // page_size),
    }


# ── NEW: Export ALL records (no pagination) ──────────────────────────────────
@app.get("/export-all")
def export_all(
    county: Optional[str]                = Query(None),
    start_date: Optional[str]            = Query(None),
    end_date: Optional[str]              = Query(None),
    hearing_resolution_id: Optional[str] = Query(None),
    protest_code: Optional[str]          = Query(None),
    protest_reason: Optional[str]        = Query(None),
    hearing_finalized: Optional[str]     = Query(None),
    hearing_status: Optional[str]        = Query(None),
    coded_status: Optional[str]          = Query(None),
    aofa_status: Optional[str]           = Query(None),
    account_number: Optional[str]        = Query(None),
    owner_name: Optional[str]            = Query(None),
    property_address: Optional[str]      = Query(None),
):
    """Returns ALL matching records without pagination — used for full Excel export."""
    conn = get_conn()
    cursor = conn.cursor(as_dict=True)

    extra_filters = build_extra_filters(
        county, start_date, end_date,
        hearing_resolution_id, protest_code, protest_reason,
        hearing_finalized, hearing_status, coded_status, aofa_status,
        account_number, owner_name, property_address
    )

    shared_cte = build_shared_cte(extra_filters)

    data_query = shared_cte + """
    SELECT *
    FROM (
        SELECT *,
            ROW_NUMBER() OVER (
                PARTITION BY accountnumber, CountyId
                ORDER BY
                    CASE
                        WHEN IsUdiAccount = 1 THEN 0
                        WHEN IsUdiAccount IS NULL THEN 2
                        ELSE 1
                    END
            ) AS rn
        FROM FinalResult
    ) deduped
    WHERE rn = 1
    ORDER BY FormalHearingDate DESC
    """

    cursor.execute(data_query)
    rows = cursor.fetchall()
    conn.close()

    return {"data": rows, "total": len(rows)}


@app.get("/counties")
def get_counties():
    conn = get_conn()
    cursor = conn.cursor(as_dict=True)
    cursor.execute("""
        SELECT DISTINCT c.Countyname
        FROM ptax_county c WITH (NOLOCK)
        WHERE c.StateId = '44' AND c.Countyname IS NOT NULL
        ORDER BY c.Countyname
    """)
    rows = cursor.fetchall()
    conn.close()
    return [r["Countyname"] for r in rows]


@app.get("/filter-options")
def get_filter_options():
    conn = get_conn()
    cursor = conn.cursor(as_dict=True)

    def fetch(sql):
        cursor.execute(sql)
        return cursor.fetchall()

    hearing_resolution = fetch("""
        SELECT DISTINCT CAST(HearingResolutionId AS VARCHAR) AS val
        FROM ptax_hearingresult WITH (NOLOCK)
        WHERE HearingResolutionId IS NOT NULL ORDER BY val
    """)
    protest_codes = fetch("""
        SELECT DISTINCT ProtestCodeValues AS val
        FROM PTAX_ProtestCodeValues WITH (NOLOCK)
        WHERE ProtestCodeValues IS NOT NULL ORDER BY val
    """)
    protest_reasons = fetch("""
        SELECT DISTINCT ProtestReason AS val
        FROM PTAX_Protestreason WITH (NOLOCK)
        WHERE ProtestReason IS NOT NULL ORDER BY val
    """)
    hearing_statuses = fetch("""
        SELECT DISTINCT HearingStatus AS val
        FROM ptax_hearingstatus WITH (NOLOCK)
        WHERE HearingStatus IS NOT NULL ORDER BY val
    """)

    conn.close()
    return {
        "hearingResolutionIds": ["(blank)"] + [r["val"] for r in hearing_resolution],
        "protestCodes":         ["(blank)"] + [r["val"] for r in protest_codes],
        "protestReasons":       ["(blank)"] + [r["val"] for r in protest_reasons],
        "hearingStatuses":      ["(blank)"] + [r["val"] for r in hearing_statuses],
        "hearingFinalized":     ["true", "false"],
        "codedStatus":          ["Coded", "Not Coded"],
        "aofaStatus":           ["Valid A of A", "Expired", "No A of A"],
    }


@app.get("/debug-protestcode")
def debug_protestcode():
    conn = get_conn()
    cursor = conn.cursor(as_dict=True)
    cursor.execute("""
        SELECT 
            pc.ProtestCodeValues,
            pc.ProtestCodeValueId,
            pd.ProtestCodeId,
            COUNT(*) AS cnt
        FROM ptax_account a WITH (NOLOCK)
        INNER JOIN ptax_yearlyhearingdetails b WITH (NOLOCK) ON b.accountid = a.accountid AND b.TaxYear = 2026
        LEFT JOIN ptax_hearingdetails hd WITH (NOLOCK) ON hd.YearlyHearingDetailsId = b.YearlyHearingDetailsId
        LEFT JOIN ptax_county c WITH (NOLOCK) ON c.countyid = a.countyid
        LEFT JOIN PTAX_ProtestDetails pd WITH (NOLOCK) ON b.ProtestingDetailsId = pd.ProtestDetailsId
        LEFT JOIN PTAX_ProtestCodeValues pc WITH (NOLOCK) ON pc.ProtestCodeValueId = ISNULL(pd.ProtestCodeId, 12)
        WHERE hd.HearingTypeId = 1 AND a.accountstatusid IN (1,4,5) AND c.StateId = '44'
        AND c.Countyname = 'Ellis'
        AND CAST(hd.FormalHearingDate AS DATE) >= '2026-04-16'
        AND CAST(hd.FormalHearingDate AS DATE) <= '2026-05-11'
        GROUP BY pc.ProtestCodeValues, pc.ProtestCodeValueId, pd.ProtestCodeId
    """)
    rows = cursor.fetchall()
    conn.close()
    return rows


@app.get("/debug-mls")
def debug_mls():
    conn = get_conn()
    cursor = conn.cursor(as_dict=True)
    results = {}

    cursor.execute("""
        SELECT COUNT(*) AS cnt
        FROM ptax_account a WITH (NOLOCK)
        INNER JOIN ptax_yearlyhearingdetails b WITH (NOLOCK) ON b.accountid = a.accountid AND b.TaxYear = 2026
        LEFT JOIN ptax_hearingdetails hd WITH (NOLOCK) ON hd.YearlyHearingDetailsId = b.YearlyHearingDetailsId
        LEFT JOIN ptax_county c WITH (NOLOCK) ON c.countyid = a.countyid
        WHERE hd.HearingTypeId = 1 AND a.accountstatusid IN (1,4,5) AND c.StateId = '44'
        AND c.Countyname = 'Ellis'
        AND CAST(hd.FormalHearingDate AS DATE) >= '2026-04-16'
        AND CAST(hd.FormalHearingDate AS DATE) <= '2026-05-11'
    """)
    results["1_base_county_date"] = cursor.fetchone()["cnt"]

    cursor.execute("""
        SELECT COUNT(*) AS cnt
        FROM ptax_account a WITH (NOLOCK)
        INNER JOIN ptax_yearlyhearingdetails b WITH (NOLOCK) ON b.accountid = a.accountid AND b.TaxYear = 2026
        LEFT JOIN ptax_hearingdetails hd WITH (NOLOCK) ON hd.YearlyHearingDetailsId = b.YearlyHearingDetailsId
        LEFT JOIN ptax_county c WITH (NOLOCK) ON c.countyid = a.countyid
        LEFT JOIN ptax_hearingresult hr WITH (NOLOCK) ON hr.HearingDetailsId = hd.HearingDetailsId
        WHERE hd.HearingTypeId = 1 AND a.accountstatusid IN (1,4,5) AND c.StateId = '44'
        AND c.Countyname = 'Ellis'
        AND CAST(hd.FormalHearingDate AS DATE) >= '2026-04-16'
        AND CAST(hd.FormalHearingDate AS DATE) <= '2026-05-11'
        AND (hr.HearingResolutionId IS NULL OR CAST(hr.HearingResolutionId AS VARCHAR) IN ('8','26'))
    """)
    results["2_plus_resolution"] = cursor.fetchone()["cnt"]

    cursor.execute("""
        SELECT COUNT(*) AS cnt
        FROM ptax_account a WITH (NOLOCK)
        INNER JOIN ptax_yearlyhearingdetails b WITH (NOLOCK) ON b.accountid = a.accountid AND b.TaxYear = 2026
        LEFT JOIN ptax_hearingdetails hd WITH (NOLOCK) ON hd.YearlyHearingDetailsId = b.YearlyHearingDetailsId
        LEFT JOIN ptax_county c WITH (NOLOCK) ON c.countyid = a.countyid
        LEFT JOIN ptax_hearingresult hr WITH (NOLOCK) ON hr.HearingDetailsId = hd.HearingDetailsId
        LEFT JOIN PTAX_ProtestDetails pd WITH (NOLOCK) ON b.ProtestingDetailsId = pd.ProtestDetailsId
        LEFT JOIN PTAX_ProtestCodeValues pc WITH (NOLOCK) ON pc.ProtestCodeValueId = ISNULL(pd.ProtestCodeId, 12)
        WHERE hd.HearingTypeId = 1 AND a.accountstatusid IN (1,4,5) AND c.StateId = '44'
        AND c.Countyname = 'Ellis'
        AND CAST(hd.FormalHearingDate AS DATE) >= '2026-04-16'
        AND CAST(hd.FormalHearingDate AS DATE) <= '2026-05-11'
        AND (hr.HearingResolutionId IS NULL OR CAST(hr.HearingResolutionId AS VARCHAR) IN ('8','26'))
        AND pc.ProtestCodeValues IN ('Protested','Protested by client')
    """)
    results["3_plus_protestcode"] = cursor.fetchone()["cnt"]

    cursor.execute("""
        SELECT COUNT(*) AS cnt
        FROM ptax_account a WITH (NOLOCK)
        INNER JOIN ptax_yearlyhearingdetails b WITH (NOLOCK) ON b.accountid = a.accountid AND b.TaxYear = 2026
        LEFT JOIN ptax_hearingdetails hd WITH (NOLOCK) ON hd.YearlyHearingDetailsId = b.YearlyHearingDetailsId
        LEFT JOIN ptax_county c WITH (NOLOCK) ON c.countyid = a.countyid
        LEFT JOIN ptax_hearingresult hr WITH (NOLOCK) ON hr.HearingDetailsId = hd.HearingDetailsId
        LEFT JOIN PTAX_ProtestDetails pd WITH (NOLOCK) ON b.ProtestingDetailsId = pd.ProtestDetailsId
        LEFT JOIN PTAX_ProtestCodeValues pc WITH (NOLOCK) ON pc.ProtestCodeValueId = ISNULL(pd.ProtestCodeId, 12)
        WHERE hd.HearingTypeId = 1 AND a.accountstatusid IN (1,4,5) AND c.StateId = '44'
        AND c.Countyname = 'Ellis'
        AND CAST(hd.FormalHearingDate AS DATE) >= '2026-04-16'
        AND CAST(hd.FormalHearingDate AS DATE) <= '2026-05-11'
        AND (hr.HearingResolutionId IS NULL OR CAST(hr.HearingResolutionId AS VARCHAR) IN ('8','26'))
        AND pc.ProtestCodeValues IN ('Protested','Protested by client')
        AND (hr.HearingFinalized = 0 OR hr.HearingFinalized IS NULL)
    """)
    results["4_plus_finalized_false"] = cursor.fetchone()["cnt"]

    cursor.execute("""
        SELECT COUNT(*) AS cnt
        FROM ptax_account a WITH (NOLOCK)
        INNER JOIN ptax_yearlyhearingdetails b WITH (NOLOCK) ON b.accountid = a.accountid AND b.TaxYear = 2026
        LEFT JOIN ptax_hearingdetails hd WITH (NOLOCK) ON hd.YearlyHearingDetailsId = b.YearlyHearingDetailsId
        LEFT JOIN ptax_county c WITH (NOLOCK) ON c.countyid = a.countyid
        LEFT JOIN ptax_hearingresult hr WITH (NOLOCK) ON hr.HearingDetailsId = hd.HearingDetailsId
        LEFT JOIN PTAX_ProtestDetails pd WITH (NOLOCK) ON b.ProtestingDetailsId = pd.ProtestDetailsId
        LEFT JOIN PTAX_ProtestCodeValues pc WITH (NOLOCK) ON pc.ProtestCodeValueId = ISNULL(pd.ProtestCodeId, 12)
        LEFT JOIN PTAX_AofA aof WITH (NOLOCK) ON aof.ClientId = a.clientid AND aof.AccountId = a.AccountId
        WHERE hd.HearingTypeId = 1 AND a.accountstatusid IN (1,4,5) AND c.StateId = '44'
        AND c.Countyname = 'Ellis'
        AND CAST(hd.FormalHearingDate AS DATE) >= '2026-04-16'
        AND CAST(hd.FormalHearingDate AS DATE) <= '2026-05-11'
        AND (hr.HearingResolutionId IS NULL OR CAST(hr.HearingResolutionId AS VARCHAR) IN ('8','26'))
        AND pc.ProtestCodeValues IN ('Protested','Protested by client')
        AND (hr.HearingFinalized = 0 OR hr.HearingFinalized IS NULL)
        AND aof.DateCoded IS NOT NULL
    """)
    results["5_plus_coded"] = cursor.fetchone()["cnt"]

    cursor.execute("""
        SELECT COUNT(*) AS cnt
        FROM ptax_account a WITH (NOLOCK)
        INNER JOIN ptax_yearlyhearingdetails b WITH (NOLOCK) ON b.accountid = a.accountid AND b.TaxYear = 2026
        LEFT JOIN ptax_hearingdetails hd WITH (NOLOCK) ON hd.YearlyHearingDetailsId = b.YearlyHearingDetailsId
        LEFT JOIN ptax_county c WITH (NOLOCK) ON c.countyid = a.countyid
        LEFT JOIN ptax_hearingresult hr WITH (NOLOCK) ON hr.HearingDetailsId = hd.HearingDetailsId
        LEFT JOIN PTAX_ProtestDetails pd WITH (NOLOCK) ON b.ProtestingDetailsId = pd.ProtestDetailsId
        LEFT JOIN PTAX_ProtestCodeValues pc WITH (NOLOCK) ON pc.ProtestCodeValueId = ISNULL(pd.ProtestCodeId, 12)
        LEFT JOIN PTAX_AofA aof WITH (NOLOCK) ON aof.ClientId = a.clientid AND aof.AccountId = a.AccountId
        WHERE hd.HearingTypeId = 1 AND a.accountstatusid IN (1,4,5) AND c.StateId = '44'
        AND c.Countyname = 'Ellis'
        AND CAST(hd.FormalHearingDate AS DATE) >= '2026-04-16'
        AND CAST(hd.FormalHearingDate AS DATE) <= '2026-05-11'
        AND (hr.HearingResolutionId IS NULL OR CAST(hr.HearingResolutionId AS VARCHAR) IN ('8','26'))
        AND pc.ProtestCodeValues IN ('Protested','Protested by client')
        AND (hr.HearingFinalized = 0 OR hr.HearingFinalized IS NULL)
        AND aof.DateCoded IS NOT NULL
        AND aof.ExpiryDate >= GETDATE()
    """)
    results["6_plus_valid_aofa"] = cursor.fetchone()["cnt"]

    conn.close()
    return results


@app.get("/test")
def test_data():
    conn = get_conn()
    cursor = conn.cursor(as_dict=True)
    cursor.execute("""
        SELECT DISTINCT b.TaxYear
        FROM ptax_yearlyhearingdetails b WITH (NOLOCK)
        ORDER BY b.TaxYear DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return rows


# ── Outlook Draft with XLSX Attachment ───────────────────────────────────────
from fastapi import Body
from pydantic import BaseModel
from typing import List
import tempfile, os, base64

class OutlookRequest(BaseModel):
    to: str
    cc: List[str]
    subject: str
    body: str
    file_name: str        # e.g. Missing_HB201_Evidence_Apr22_Ellis.xlsx
    file_b64: str         # base64-encoded xlsx bytes

@app.post("/send-outlook")
def send_outlook(req: OutlookRequest):
    """
    Receives XLSX (base64) + mail metadata.
    Writes XLSX to temp file, opens Outlook draft with attachment.
    User reviews and clicks Send manually.
    """
    if not WIN32_AVAILABLE:
        return {"ok": False, "error": "pywin32 not installed. Run: pip install pywin32"}

    try:
        # Must initialize COM on this thread (FastAPI runs on worker threads)
        pythoncom.CoInitialize()

        # Decode and write xlsx to temp folder
        xlsx_bytes = base64.b64decode(req.file_b64)
        tmp_path   = os.path.join(tempfile.gettempdir(), req.file_name)
        with open(tmp_path, "wb") as f:
            f.write(xlsx_bytes)

        # Open Outlook draft
        outlook = win32.Dispatch("Outlook.Application")
        mail    = outlook.CreateItem(0)   # olMailItem
        mail.To      = req.to
        mail.CC      = ";".join(req.cc)
        mail.Subject = req.subject
        mail.Body    = req.body
        mail.Attachments.Add(tmp_path)
        mail.Display()   # opens draft — user clicks Send

        return {"ok": True}

    except Exception as e:
        err = str(e)
        if "dialog box is open" in err or "-2147467259" in err:
            return {"ok": False, "error": "Outlook-ல் ஒரு dialog box திறந்திருக்கு. Outlook-ஐ திறந்து அந்த popup-ஐ close பண்ணிட்டு மீண்டும் try பண்ணுங்கள்."}
        return {"ok": False, "error": err}

    finally:
        try:
            pythoncom.CoUninitialize()
        except:
            pass


# ── Tuan Sent Tracking (JSON file on server) ─────────────────────────────────
import json
from datetime import datetime
from pathlib import Path

SENT_FILE = Path(__file__).parent / "tuan_sent.json"

def load_sent() -> dict:
    if SENT_FILE.exists():
        try:
            return json.loads(SENT_FILE.read_text(encoding="utf-8"))
        except:
            return {}
    return {}

def save_sent(data: dict):
    SENT_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

class MarkSentRequest(BaseModel):
    records: List[dict]   # [{ "accountnumber": "...", "county": "..." }, ...]
    sent_by: str

@app.post("/tuan-sent/mark")
def mark_sent(req: MarkSentRequest):
    """Mark records as sent to Tuan."""
    data = load_sent()
    now  = datetime.now().strftime("%Y-%m-%d %H:%M")
    for r in req.records:
        key = f"{r['accountnumber']}|{r.get('county','')}"
        data[key] = {"sent_date": now, "sent_by": req.sent_by}
    save_sent(data)
    return {"ok": True, "marked": len(req.records)}

@app.get("/tuan-sent/list")
def list_sent():
    """Return all sent records as { 'accountnumber|county': { sent_date, sent_by } }"""
    return load_sent()

@app.delete("/tuan-sent/clear")
def clear_sent():
    """Admin: clear all sent records."""
    save_sent({})
    return {"ok": True}

# ── Serve React frontend ──────────────────────────────────────────────────────
DIST_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        index = os.path.join(DIST_DIR, "index.html")
        return FileResponse(index)

