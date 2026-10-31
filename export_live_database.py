import os
import sys

# Ensure backend directory is in sys.path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.services.database_sync_service import export_database_now, get_target_directories

if __name__ == "__main__":
    if sys.platform == 'win32':
        try:
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass

    print("=" * 80)
    print("  Campus Hub - Live Database & SSMS Table Exporter")
    print("  Chief Administrator: UTKARSH KUSHWAHA")
    print("=" * 80)
    print("Synchronizing all database tables to File Explorer...")

    success = export_database_now()
    if success:
        target_dirs = get_target_directories()
        print("Export completed successfully to:")
        for d in target_dirs:
            print(f"  📁 {d}")
        print()
        print("Generated files:")
        print("  - 01_ID_Verification_and_Approvals.csv")
        print("  - 02_Users_and_Institutional_Roles.csv")
        print("  - 03_Problem_Box_Grievances_and_Admin_Replies.csv")
        print("  - 04_Ask_Up_Direct_Messages_and_Locations.csv")
        print("  - 05_Admin_Audit_Logs_Real_Time.csv")
        print("  - 06_Purpose_Groups_and_Members.csv")
        print("  - Database_Viewer.html (SSMS Grid Interactive Viewer)")
    else:
        print("[!] Export encountered an issue or database is currently locked.")
