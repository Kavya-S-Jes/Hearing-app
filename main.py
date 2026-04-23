from fastapi import FastAPI, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import pymssql
from pydantic import BaseModel
import json, tempfile, os, base64
from datetime import datetime
from pathlib import Path

DB_SERVER   = "SPXDB"
DB_DATABASE = "spartaxx"

# ─────────────────────────────────────────────────────────────────
# LOCAL MOCK MODE
# True  → DB தேவையில்ல, fake data return பண்ணும் (home/local testing)
# False → Real MSSQL DB connect ஆகும் (office use)
# ─────────────────────────────────────────────────────────────────
USE_MOCK = True

app = FastAPI(title="Hearing Accounts API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_conn():
    if USE_MOCK:
        return None
    return pymssql.connect(server=DB_SERVER, database=DB_DATABASE)


# ─── Mock Data ────────────────────────────────────────────────────
MOCK_HEARINGS = [
    {
        "IsUdiAccount": 1,
        "Countyid": 1,
        "Countyname": "Ellis",
        "ClientStatus": "Active",
        "accountnumber": "1000001",
        "CADLegalName": "SMITH JOHN",
        "Acc.property address": "123 Main St",
        "cityid": "WAXAHACHIE",
        "zipcode": "75165",
        "StartDate": "2020-01-01T00:00:00",
        "EndDate": None,
        "clientnumber": "C10001",
        "OCALUC": "A1",
        "NeighbourhoodCode": "N001",
        "completionDateAndTime": None,
        "accountstatusid": 1,
        "Accountstatus": "Active",
        "NoticedDate": "2026-03-01T00:00:00",
        "HearingType": "Formal",
        "HearingResolutionId": None,
        "ProtestCodeValues": "Protested",
        "ProtestReason": None,
        "HearingFinalized": False,
        "HearingStatus": None,
        "InformalHearingDate": None,
        "FormalHearingDate": "2026-04-25T09:00:00",
        "CADEvidenceLetterDate": None,
        "CADEvidenceScanDate": None,
        "CADUEValue": 250000,
        "CADMarketMeanValue": 260000,
        "CADMarketMedianValue": 255000,
        "OfferDate": None,
        "OfferValue": None,
        "NoticeMarketValue": 270000,
        "NoticeTotalValue": 270000,
        "PostHearingMarketValue": None,
        "PostHearingTotalValue": None,
        "ReceivedDate": "2025-06-01T00:00:00",
        "ExpiryDate": "2027-06-01T00:00:00",
        "DateCoded": "2026-01-15T00:00:00",
        "OriginalDateCoded": "2026-01-15T00:00:00",
        "DateCodedEnd": None,
        "CodedStatus": "Coded",
        "AofAStatus": "Valid A of A",
        "case_id": "1000001",
        "hearing_date": "2026-04-25T09:00:00",
        "county": "Ellis",
        "status": None,
        "plaintiff": "SMITH JOHN",
        "defendant": "C10001",
    },
    {
        "IsUdiAccount": 0,
        "Countyid": 2,
        "Countyname": "Tarrant",
        "ClientStatus": "Active",
        "accountnumber": "1000002",
        "CADLegalName": "JOHNSON MARY LLC",
        "Acc.property address": "456 Oak Ave",
        "cityid": "FORT WORTH",
        "zipcode": "76101",
        "StartDate": "2019-05-10T00:00:00",
        "EndDate": None,
        "clientnumber": "C10002",
        "OCALUC": "B2",
        "NeighbourhoodCode": "N002",
        "completionDateAndTime": None,
        "accountstatusid": 1,
        "Accountstatus": "Active",
        "NoticedDate": "2026-03-05T00:00:00",
        "HearingType": "Formal",
        "HearingResolutionId": 8,
        "ProtestCodeValues": "Protested by client",
        "ProtestReason": None,
        "HearingFinalized": False,
        "HearingStatus": None,
        "InformalHearingDate": None,
        "FormalHearingDate": "2026-04-27T10:00:00",
        "CADEvidenceLetterDate": "2026-02-01T00:00:00",
        "CADEvidenceScanDate": None,
        "CADUEValue": 500000,
        "CADMarketMeanValue": 510000,
        "CADMarketMedianValue": 505000,
        "OfferDate": None,
        "OfferValue": None,
        "NoticeMarketValue": 520000,
        "NoticeTotalValue": 520000,
        "PostHearingMarketValue": None,
        "PostHearingTotalValue": None,
        "ReceivedDate": "2025-08-01T00:00:00",
        "ExpiryDate": "2027-08-01T00:00:00",
        "DateCoded": "2026-02-10T00:00:00",
        "OriginalDateCoded": "2026-02-10T00:00:00",
        "DateCodedEnd": None,
        "CodedStatus": "Coded",
        "AofAStatus": "Valid A of A",
        "case_id": "1000002",
        "hearing_date": "2026-04-27T10:00:00",
        "county": "Tarrant",
        "status": None,
        "plaintiff": "JOHNSON MARY LLC",
        "defendant": "C10002",
    },
    {
        "IsUdiAccount": 0,
        "Countyid": 3,
        "Countyname": "Dallas",
        "ClientStatus": "Active",
        "accountnumber": "1000003",
        "CADLegalName": "WILLIAMS PROPERTIES",
        "Acc.property address": "789 Elm Blvd",
        "cityid": "DALLAS",
        "zipcode": "75201",
        "StartDate": "2021-03-15T00:00:00",
        "EndDate": None,
        "clientnumber": "C10003",
        "OCALUC": "C3",
        "NeighbourhoodCode": "N003",
        "completionDateAndTime": None,
        "accountstatusid": 4,
        "Accountstatus": "Inactive",
        "NoticedDate": "2026-03-10T00:00:00",
        "HearingType": "Formal",
        "HearingResolutionId": 26,
        "ProtestCodeValues": "Protested",
        "ProtestReason": None,
        "HearingFinalized": True,
        "HearingStatus": "Scheduled",
        "InformalHearingDate": None,
        "FormalHearingDate": "2026-05-05T14:00:00",
        "CADEvidenceLetterDate": "2026-02-15T00:00:00",
        "CADEvidenceScanDate": "2026-02-20T00:00:00",
        "CADUEValue": 750000,
        "CADMarketMeanValue": 760000,
        "CADMarketMedianValue": 755000,
        "OfferDate": "2026-03-25T00:00:00",
        "OfferValue": 740000,
        "NoticeMarketValue": 780000,
        "NoticeTotalValue": 780000,
        "PostHearingMarketValue": None,
        "PostHearingTotalValue": None,
        "ReceivedDate": None,
        "ExpiryDate": None,
        "DateCoded": None,
        "OriginalDateCoded": None,
        "DateCodedEnd": None,
        "CodedStatus": "Not Coded",
        "AofAStatus": "No A of A",
        "case_id": "1000003",
        "hearing_date": "2026-05-05T14:00:00",
        "county": "Dallas",
        "status": "Scheduled",
        "plaintiff": "WILLIAMS PROPERTIES",
        "defendant": "C10003",
    },
    {
        "IsUdiAccount": 1,
        "Countyid": 1,
        "Countyname": "Ellis",
        "ClientStatus": "Active",
        "accountnumber": "1000004",
        "CADLegalName": "BROWN TRUST",
        "Acc.property address": "321 Pine Rd",
        "cityid": "ENNIS",
        "zipcode": "75119",
        "StartDate": "2018-07-01T00:00:00",
        "EndDate": None,
        "clientnumber": "C10004",
        "OCALUC": "A2",
        "NeighbourhoodCode": "N004",
        "completionDateAndTime": None,
        "accountstatusid": 1,
        "Accountstatus": "Active",
        "NoticedDate": "2026-03-12T00:00:00",
        "HearingType": "Formal",
        "HearingResolutionId": None,
        "ProtestCodeValues": "Protested by client",
        "ProtestReason": None,
        "HearingFinalized": False,
        "HearingStatus": None,
        "InformalHearingDate": None,
        "FormalHearingDate": "2026-04-24T08:00:00",
        "CADEvidenceLetterDate": None,
        "CADEvidenceScanDate": None,
        "CADUEValue": 180000,
        "CADMarketMeanValue": 185000,
        "CADMarketMedianValue": 182000,
        "OfferDate": None,
        "OfferValue": None,
        "NoticeMarketValue": 190000,
        "NoticeTotalValue": 190000,
        "PostHearingMarketValue": None,
        "PostHearingTotalValue": None,
        "ReceivedDate": "2025-09-01T00:00:00",
        "ExpiryDate": "2024-09-01T00:00:00",
        "DateCoded": "2026-01-20T00:00:00",
        "OriginalDateCoded": "2026-01-20T00:00:00",
        "DateCodedEnd": None,
        "CodedStatus": "Coded",
        "AofAStatus": "Expired",
        "case_id": "1000004",
        "hearing_date": "2026-04-24T08:00:00",
        "county": "Ellis",
        "status": None,
        "plaintiff": "BROWN TRUST",
        "defendant": "C10004",
    },
    {
        "IsUdiAccount": 0,
        "Countyid": 4,
        "Countyname": "Collin",
        "ClientStatus": "Active",
        "accountnumber": "1000005",
        "CADLegalName": "GARCIA INVESTMENTS",
        "Acc.property address": "555 Maple Dr",
        "cityid": "PLANO",
        "zipcode": "75023",
        "StartDate": "2022-01-01T00:00:00",
        "EndDate": None,
        "clientnumber": "C10005",
        "OCALUC": "D4",
        "NeighbourhoodCode": "N005",
        "completionDateAndTime": None,
        "accountstatusid": 1,
        "Accountstatus": "Active",
        "NoticedDate": "2026-03-15T00:00:00",
        "HearingType": "Formal",
        "HearingResolutionId": 8,
        "ProtestCodeValues": "Protested",
        "ProtestReason": None,
        "HearingFinalized": False,
        "HearingStatus": None,
        "InformalHearingDate": None,
        "FormalHearingDate": "2026-05-10T11:00:00",
        "CADEvidenceLetterDate": None,
        "CADEvidenceScanDate": None,
        "CADUEValue": 420000,
        "CADMarketMeanValue": 430000,
        "CADMarketMedianValue": 425000,
        "OfferDate": None,
        "OfferValue": None,
        "NoticeMarketValue": 440000,
        "NoticeTotalValue": 440000,
        "PostHearingMarketValue": None,
        "PostHearingTotalValue": None,
        "ReceivedDate": "2025-10-01T00:00:00",
        "ExpiryDate": "2027-10-01T00:00:00",
        "DateCoded": "2026-03-01T00:00:00",
        "OriginalDateCoded": "2026-03-01T00:00:00",
        "DateCodedEnd": None,
        "CodedStatus": "Coded",
        "AofAStatus": "Valid A of A",
        "case_id": "1000005",
        "hearing_date": "2026-05-10T11:00:00",
        "county": "Collin",
        "status": None,
        "plaintiff": "GARCIA INVESTMENTS",
        "defendant": "C10005",
    },
]

MOCK_COUNTIES = ["Collin", "Dallas", "Ellis", "Tarrant"]

MOCK_FILTER_OPTIONS = {
    "hearingResolutionIds": ["(blank)", "8", "26"],
    "protestCodes":         ["(blank)", "Protested", "Protested by client"],
    "protestReasons":       ["(blank)"],
    "hearingStatuses":      ["(blank)", "Scheduled"],
    "hearingFinalized":     ["true", "false"],
    "codedStatus":          ["Coded", "Not Coded"],
    "aofaStatus":           ["Valid A of A", "Expired", "No A of A"],
}


# ─── Mock filter helper ───────────────────────────────────────────
def apply_mock_filters(data, county, start_date, end_date,
                       hearing_resolution_id, protest_code, protest_reason,
                       hearing_finalized, hearing_status, coded_status,
                       aofa_status, account_number, owner_name):
    result = data[:]
    if county:
        result = [r for r in result if r["Countyname"] == county]
    if start_date:
        result = [r for r in result if r["FormalHearingDate"] and r["FormalHearingDate"][:10] >= start_date]
    if end_date:
        result = [r for r in result if r["FormalHearingDate"] and r["FormalHearingDate"][:10] <= end_date]
    if hearing_resolution_id:
        ids = [i.strip() for i in hearing_resolution_id.split(",") if i.strip()]
        has_blank = "(blank)" in ids
        real_ids  = [i for i in ids if i != "(blank)"]
        def match_res(r):
            v = r["HearingResolutionId"]
            if has_blank and v is None: return True
            if real_ids and str(v) in real_ids: return True
            return False
        result = [r for r in result if match_res(r)]
    if protest_code:
        codes = [c.strip() for c in protest_code.split(",") if c.strip()]
        has_blank  = "(blank)" in codes
        real_codes = [c for c in codes if c != "(blank)"]
        def match_pc(r):
            v = r["ProtestCodeValues"]
            if has_blank and v is None: return True
            if real_codes and v in real_codes: return True
            return False
        result = [r for r in result if match_pc(r)]
    if protest_reason == "(blank)":
        result = [r for r in result if r["ProtestReason"] is None]
    elif protest_reason:
        result = [r for r in result if r["ProtestReason"] == protest_reason]
    if hearing_finalized == "true":
        result = [r for r in result if r["HearingFinalized"] is True]
    elif hearing_finalized == "false":
        result = [r for r in result if r["HearingFinalized"] is False]
    if hearing_status == "(blank)":
        result = [r for r in result if r["HearingStatus"] is None]
    elif hearing_status:
        result = [r for r in result if r["HearingStatus"] == hearing_status]
    if coded_status:
        cs_list = [v.strip() for v in coded_status.split(",") if v.strip()]
        result = [r for r in result if r["CodedStatus"] in cs_list]
    if aofa_status:
        as_list = [v.strip() for v in aofa_status.split(",") if v.strip()]
        result = [r for r in result if r["AofAStatus"] in as_list]
    if account_number:
        result = [r for r in result if account_number.lower() in str(r["accountnumber"]).lower()]
    if owner_name:
        result = [r for r in result if owner_name.lower() in str(r["CADLegalName"]).lower()]
    return result


# ─── Routes ──────────────────────────────────────────────────────

@app.get("/")
def root():
    mode = "MOCK" if USE_MOCK else "LIVE DB"
    return {"message": f"Hearing Accounts API is running [{mode}]"}


def build_extra_filters(
    county, start_date, end_date,
    hearing_resolution_id, protest_code, protest_reason,
    hearing_finalized, hearing_status, coded_status, aofa_status,
    account_number=None, owner_name=None
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
        real_ids  = [i for i in ids if i != "(blank)"]
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
        has_blank  = "(blank)" in codes
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
            p.IsUdiAccount, c.Countyid, c.Countyname, cl.ClientStatus,
            a.accountnumber, p.CADLegalName,
            ad.addressline1 AS [Acc.property address],
            ad.cityid, ad.zipcode, a.StartDate, a.EndDate,
            f.clientnumber, e.OCALUC, NeighbourhoodCode,
            hr.completionDateAndTime, a.accountstatusid, s.Accountstatus,
            vn.NoticedDate, ht.HearingType, hr.HearingResolutionId,
            pc.ProtestCodeValues, pr.ProtestReason, hr.HearingFinalized,
            hrs.HearingStatus, hd.InformalHearingDate, hd.FormalHearingDate,
            CADEvidenceLetterDate, CADEvidenceScanDate,
            CADUEValue, CADMarketMeanValue, CADMarketMedianValue,
            OfferDate, OfferValue,
            vn.NoticeMarketValue, vn.NoticeTotalValue,
            hr.PostHearingMarketValue, hr.PostHearingTotalValue,
            aof.ReceivedDate, aof.ExpiryDate, aof.DateCoded,
            aof.OriginalDateCoded, aof.DateCodedEnd,
            CASE WHEN aof.DateCoded IS NOT NULL THEN 'Coded' ELSE 'Not Coded' END AS CodedStatus,
            CASE
                WHEN aof.ReceivedDate IS NULL THEN 'No A of A'
                WHEN aof.ExpiryDate >= GETDATE() THEN 'Valid A of A'
                ELSE 'Expired'
            END AS AofAStatus,
            a.accountnumber AS case_id, hd.FormalHearingDate AS hearing_date,
            c.Countyname AS county, hrs.HearingStatus AS status,
            p.CADLegalName AS plaintiff, f.clientnumber AS defendant
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
    page: int                            = Query(1, ge=1),
    page_size: int                       = Query(100, ge=1, le=500),
):
    if USE_MOCK:
        filtered = apply_mock_filters(
            MOCK_HEARINGS, county, start_date, end_date,
            hearing_resolution_id, protest_code, protest_reason,
            hearing_finalized, hearing_status, coded_status,
            aofa_status, account_number, owner_name
        )
        total = len(filtered)
        offset = (page - 1) * page_size
        return {
            "data": filtered[offset: offset + page_size],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, -(-total // page_size)),
        }

    conn = get_conn()
    cursor = conn.cursor(as_dict=True)
    extra_filters = build_extra_filters(
        county, start_date, end_date, hearing_resolution_id, protest_code,
        protest_reason, hearing_finalized, hearing_status, coded_status,
        aofa_status, account_number, owner_name
    )
    offset = (page - 1) * page_size
    shared_cte = build_shared_cte(extra_filters)
    count_query = shared_cte + """
    SELECT COUNT(*) AS total FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY accountnumber, CountyId
            ORDER BY CASE WHEN IsUdiAccount=1 THEN 0 WHEN IsUdiAccount IS NULL THEN 2 ELSE 1 END) AS rn
        FROM FinalResult
    ) deduped WHERE rn = 1"""
    cursor.execute(count_query)
    total_count = cursor.fetchone()["total"]
    data_query = shared_cte + f"""
    SELECT * FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY accountnumber, CountyId
            ORDER BY CASE WHEN IsUdiAccount=1 THEN 0 WHEN IsUdiAccount IS NULL THEN 2 ELSE 1 END) AS rn
        FROM FinalResult
    ) deduped WHERE rn = 1
    ORDER BY FormalHearingDate DESC
    OFFSET {offset} ROWS FETCH NEXT {page_size} ROWS ONLY"""
    cursor.execute(data_query)
    rows = cursor.fetchall()
    conn.close()
    return {"data": rows, "total": total_count, "page": page,
            "page_size": page_size, "total_pages": -(-total_count // page_size)}


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
):
    if USE_MOCK:
        filtered = apply_mock_filters(
            MOCK_HEARINGS, county, start_date, end_date,
            hearing_resolution_id, protest_code, protest_reason,
            hearing_finalized, hearing_status, coded_status,
            aofa_status, account_number, owner_name
        )
        return {"data": filtered, "total": len(filtered)}

    conn = get_conn()
    cursor = conn.cursor(as_dict=True)
    extra_filters = build_extra_filters(
        county, start_date, end_date, hearing_resolution_id, protest_code,
        protest_reason, hearing_finalized, hearing_status, coded_status,
        aofa_status, account_number, owner_name
    )
    shared_cte = build_shared_cte(extra_filters)
    data_query = shared_cte + """
    SELECT * FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY accountnumber, CountyId
            ORDER BY CASE WHEN IsUdiAccount=1 THEN 0 WHEN IsUdiAccount IS NULL THEN 2 ELSE 1 END) AS rn
        FROM FinalResult
    ) deduped WHERE rn = 1 ORDER BY FormalHearingDate DESC"""
    cursor.execute(data_query)
    rows = cursor.fetchall()
    conn.close()
    return {"data": rows, "total": len(rows)}


@app.get("/counties")
def get_counties():
    if USE_MOCK:
        return MOCK_COUNTIES
    conn = get_conn()
    cursor = conn.cursor(as_dict=True)
    cursor.execute("""
        SELECT DISTINCT c.Countyname FROM ptax_county c WITH (NOLOCK)
        WHERE c.StateId = '44' AND c.Countyname IS NOT NULL ORDER BY c.Countyname
    """)
    rows = cursor.fetchall()
    conn.close()
    return [r["Countyname"] for r in rows]


@app.get("/filter-options")
def get_filter_options():
    if USE_MOCK:
        return MOCK_FILTER_OPTIONS
    conn = get_conn()
    cursor = conn.cursor(as_dict=True)
    def fetch(sql):
        cursor.execute(sql)
        return cursor.fetchall()
    hr = fetch("SELECT DISTINCT CAST(HearingResolutionId AS VARCHAR) AS val FROM ptax_hearingresult WITH (NOLOCK) WHERE HearingResolutionId IS NOT NULL ORDER BY val")
    pc = fetch("SELECT DISTINCT ProtestCodeValues AS val FROM PTAX_ProtestCodeValues WITH (NOLOCK) WHERE ProtestCodeValues IS NOT NULL ORDER BY val")
    pr = fetch("SELECT DISTINCT ProtestReason AS val FROM PTAX_Protestreason WITH (NOLOCK) WHERE ProtestReason IS NOT NULL ORDER BY val")
    hs = fetch("SELECT DISTINCT HearingStatus AS val FROM ptax_hearingstatus WITH (NOLOCK) WHERE HearingStatus IS NOT NULL ORDER BY val")
    conn.close()
    return {
        "hearingResolutionIds": ["(blank)"] + [r["val"] for r in hr],
        "protestCodes":         ["(blank)"] + [r["val"] for r in pc],
        "protestReasons":       ["(blank)"] + [r["val"] for r in pr],
        "hearingStatuses":      ["(blank)"] + [r["val"] for r in hs],
        "hearingFinalized":     ["true", "false"],
        "codedStatus":          ["Coded", "Not Coded"],
        "aofaStatus":           ["Valid A of A", "Expired", "No A of A"],
    }


@app.get("/debug-protestcode")
def debug_protestcode():
    if USE_MOCK:
        return [{"ProtestCodeValues": "Protested", "cnt": 2}]
    conn = get_conn()
    cursor = conn.cursor(as_dict=True)
    cursor.execute("""
        SELECT pc.ProtestCodeValues, pc.ProtestCodeValueId, pd.ProtestCodeId, COUNT(*) AS cnt
        FROM ptax_account a WITH (NOLOCK)
        INNER JOIN ptax_yearlyhearingdetails b WITH (NOLOCK) ON b.accountid=a.accountid AND b.TaxYear=2026
        LEFT JOIN ptax_hearingdetails hd WITH (NOLOCK) ON hd.YearlyHearingDetailsId=b.YearlyHearingDetailsId
        LEFT JOIN ptax_county c WITH (NOLOCK) ON c.countyid=a.countyid
        LEFT JOIN PTAX_ProtestDetails pd WITH (NOLOCK) ON b.ProtestingDetailsId=pd.ProtestDetailsId
        LEFT JOIN PTAX_ProtestCodeValues pc WITH (NOLOCK) ON pc.ProtestCodeValueId=ISNULL(pd.ProtestCodeId,12)
        WHERE hd.HearingTypeId=1 AND a.accountstatusid IN (1,4,5) AND c.StateId='44'
        AND c.Countyname='Ellis'
        AND CAST(hd.FormalHearingDate AS DATE)>='2026-04-16'
        AND CAST(hd.FormalHearingDate AS DATE)<='2026-05-11'
        GROUP BY pc.ProtestCodeValues,pc.ProtestCodeValueId,pd.ProtestCodeId
    """)
    rows = cursor.fetchall()
    conn.close()
    return rows


@app.get("/debug-mls")
def debug_mls():
    if USE_MOCK:
        return {"mock_mode": True, "message": "Debug not available in mock mode"}
    conn = get_conn()
    cursor = conn.cursor(as_dict=True)
    results = {}
    cursor.execute("""SELECT COUNT(*) AS cnt FROM ptax_account a WITH (NOLOCK)
        INNER JOIN ptax_yearlyhearingdetails b WITH (NOLOCK) ON b.accountid=a.accountid AND b.TaxYear=2026
        LEFT JOIN ptax_hearingdetails hd WITH (NOLOCK) ON hd.YearlyHearingDetailsId=b.YearlyHearingDetailsId
        LEFT JOIN ptax_county c WITH (NOLOCK) ON c.countyid=a.countyid
        WHERE hd.HearingTypeId=1 AND a.accountstatusid IN (1,4,5) AND c.StateId='44'
        AND c.Countyname='Ellis'
        AND CAST(hd.FormalHearingDate AS DATE)>='2026-04-16'
        AND CAST(hd.FormalHearingDate AS DATE)<='2026-05-11'""")
    results["1_base_county_date"] = cursor.fetchone()["cnt"]
    conn.close()
    return results


@app.get("/test")
def test_data():
    if USE_MOCK:
        return [{"TaxYear": 2026}, {"TaxYear": 2025}]
    conn = get_conn()
    cursor = conn.cursor(as_dict=True)
    cursor.execute("SELECT DISTINCT b.TaxYear FROM ptax_yearlyhearingdetails b WITH (NOLOCK) ORDER BY b.TaxYear DESC")
    rows = cursor.fetchall()
    conn.close()
    return rows


# ── Outlook Draft ─────────────────────────────────────────────────

class OutlookRequest(BaseModel):
    to: str
    cc: List[str]
    subject: str
    body: str
    file_name: str
    file_b64: str

@app.post("/send-outlook")
def send_outlook(req: OutlookRequest):
    if USE_MOCK:
        return {"ok": True, "message": "Mock mode — Outlook not triggered"}
    try:
        import win32com.client as win32
        import pythoncom
    except ImportError:
        return {"ok": False, "error": "pywin32 not installed. Run: pip install pywin32"}
    try:
        pythoncom.CoInitialize()
        xlsx_bytes = base64.b64decode(req.file_b64)
        tmp_path   = os.path.join(tempfile.gettempdir(), req.file_name)
        with open(tmp_path, "wb") as f:
            f.write(xlsx_bytes)
        outlook = win32.Dispatch("Outlook.Application")
        mail    = outlook.CreateItem(0)
        mail.To      = req.to
        mail.CC      = ";".join(req.cc)
        mail.Subject = req.subject
        mail.Body    = req.body
        mail.Attachments.Add(tmp_path)
        mail.Display()
        return {"ok": True}
    except Exception as e:
        err = str(e)
        if "dialog box is open" in err or "-2147467259" in err:
            return {"ok": False, "error": "Outlook-ல் dialog box திறந்திருக்கு. Close பண்ணிட்டு try பண்ணுங்கள்."}
        return {"ok": False, "error": err}
    finally:
        try: pythoncom.CoUninitialize()
        except: pass


# ── Tuan Sent Tracking ────────────────────────────────────────────

SENT_FILE = Path(__file__).parent / "tuan_sent.json"

def load_sent() -> dict:
    if SENT_FILE.exists():
        try: return json.loads(SENT_FILE.read_text(encoding="utf-8"))
        except: return {}
    return {}

def save_sent(data: dict):
    SENT_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

class MarkSentRequest(BaseModel):
    records: List[dict]
    sent_by: str

@app.post("/tuan-sent/mark")
def mark_sent(req: MarkSentRequest):
    data = load_sent()
    now  = datetime.now().strftime("%Y-%m-%d %H:%M")
    for r in req.records:
        key = f"{r['accountnumber']}|{r.get('county','')}"
        data[key] = {"sent_date": now, "sent_by": req.sent_by}
    save_sent(data)
    return {"ok": True, "marked": len(req.records)}

@app.get("/tuan-sent/list")
def list_sent():
    return load_sent()

@app.delete("/tuan-sent/clear")
def clear_sent():
    save_sent({})
    return {"ok": True}
