package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/service"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AdminRepoPG struct{ db *pgxpool.Pool }

func NewAdminRepo(db *pgxpool.Pool) *AdminRepoPG { return &AdminRepoPG{db} }

func (r *AdminRepoPG) CountListings(ctx context.Context) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM listings WHERE status != 'removed'`).Scan(&n)
	return n, err
}
func (r *AdminRepoPG) CountUsers(ctx context.Context) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&n)
	return n, err
}
func (r *AdminRepoPG) CountReportsByStatus(ctx context.Context) (int, int, int, int, error) {
	var open, rev, res, dis int
	err := r.db.QueryRow(ctx, `
		SELECT
		  COUNT(*) FILTER (WHERE status='open'),
		  COUNT(*) FILTER (WHERE status='reviewing'),
		  COUNT(*) FILTER (WHERE status='resolved'),
		  COUNT(*) FILTER (WHERE status='dismissed')
		FROM reports`).Scan(&open, &rev, &res, &dis)
	return open, rev, res, dis, err
}

func (r *AdminRepoPG) ListUsers(ctx context.Context, limit, offset int) ([]service.AdminUserRow, int, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, name, email, role, created_at
		FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []service.AdminUserRow
	for rows.Next() {
		var u service.AdminUserRow
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.CreatedAt); err != nil {
			return nil, 0, err
		}
		out = append(out, u)
	}
	var total int
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&total); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (r *AdminRepoPG) ForceRemoveListing(ctx context.Context, listingID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `
		UPDATE listings SET status='removed', updated_at=now() WHERE id=$1`, listingID)
	return err
}
