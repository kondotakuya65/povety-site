"""Run money operations from cron.

Examples:
    python -m app.scripts.money_jobs payouts
    python -m app.scripts.money_jobs refunds
"""

import argparse

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import User, UserRole
from app.services.money_operations import run_weekly_payouts, serialize_batch, sweep_expired_requests


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("job", choices=("payouts", "refunds"))
    args = parser.parse_args()

    db = SessionLocal()
    try:
        admin = db.scalar(select(User).where(User.role == UserRole.ADMIN.value))
        if admin is None:
            raise SystemExit("No admin user exists; run the seed script first")

        if args.job == "payouts":
            print(serialize_batch(run_weekly_payouts(db, admin=admin)))
        else:
            print(sweep_expired_requests(db, actor=admin))
    finally:
        db.close()


if __name__ == "__main__":
    main()
