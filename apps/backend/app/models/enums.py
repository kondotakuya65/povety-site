from enum import StrEnum


class UserRole(StrEnum):
    USER = "user"
    ADMIN = "admin"


class HelpRequestStatus(StrEnum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    LIVE = "live"
    FUNDED = "funded"
    CLOSED_REFUNDED = "closed_refunded"
    REJECTED = "rejected"


OPEN_HELP_REQUEST_STATUSES = (
    HelpRequestStatus.DRAFT,
    HelpRequestStatus.PENDING_REVIEW,
    HelpRequestStatus.LIVE,
)


class Visibility(StrEnum):
    PUBLIC = "public"
    PRIVATE = "private"


class VerificationType(StrEnum):
    NIN = "nin"
    PHONE = "phone"


class DonationStatus(StrEnum):
    HELD = "held"
    PAID_OUT = "paid_out"
    REFUNDED = "refunded"


class PayoutBatchStatus(StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class PayoutStatus(StrEnum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"


class RefundStatus(StrEnum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"


class RefundReason(StrEnum):
    UNMET_GOAL = "unmet_goal"
    DONOR_REQUESTED = "donor_requested"
    FAILED_CHARGE = "failed_charge"
    DUPLICATE = "duplicate"


class SettingValueType(StrEnum):
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"


class MediaKind(StrEnum):
    PHOTO = "photo"
    DOCUMENT = "document"
