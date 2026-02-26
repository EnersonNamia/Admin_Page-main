#!/usr/bin/env python3
"""
Quick migration script - Run this to optimize your database performance
"""

import sys
import os

# Add backend_python to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend_python'))

from migrations import run_migrations

if __name__ == "__main__":
    print("=" * 60)
    print("  🚀 DATABASE PERFORMANCE OPTIMIZATION - MIGRATION RUNNER")
    print("=" * 60)
    print()
    
    run_migrations()
    
    print("\n" + "=" * 60)
    print("  ✅ MIGRATION COMPLETE!")
    print("=" * 60)
    print()
    print("Your application should now be significantly faster!")
    print()
    print("Performance improvements applied:")
    print("  • Optimized N+1 queries in get_questions endpoint")
    print("  • Optimized N+1 queries in get_users endpoint")
    print("  • Combined multiple COUNT queries in analytics")
    print("  • Added database indexes for frequent queries")
    print()
    print("Restart your backend server to apply optimizations.")
    print()
