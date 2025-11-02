package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ReportRepoPG struct{ db *pgxpool.Pool }

func NewReportRepo(db *pgxpool.Pool) *ReportRepoPG { return &ReportRepoPG{db} }

func (r *ReportRepoPG) Create(ctx context.Context, listingID, reporterID uuid.UUID, reason string) (domain.Report, error) {
	id := uuid.New()
	_, err := r.db.Exec(ctx, `
		INSERT INTO reports (id, listing_id, reporter_id, reason)
		VALUES ($1,$2,$3,$4)`, id, listingID, reporterID, reason)
	if err != nil {
		return domain.Report{}, err
	}
	return r.GetByID(ctx, id)
}

func (r *ReportRepoPG) GetByID(ctx context.Context, id uuid.UUID) (domain.Report, error) {
	var out domain.Report
	err := r.db.QueryRow(ctx, `
		SELECT id, listing_id, reporter_id, reason, status, created_at, updated_at
		FROM reports WHERE id=$1`, id).
		Scan(&out.ID, &out.ListingID, &out.ReporterID, &out.Reason, &out.Status, &out.CreatedAt, &out.UpdatedAt)
	return out, err
}

func (r *ReportRepoPG) List(ctx context.Context, status string, limit, offset int) ([]domain.Report, int, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, listing_id, reporter_id, reason, status, created_at, updated_at
		FROM reports
		WHERE ($1 = '' OR status=$1)
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`, status, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var items []domain.Report
	for rows.Next() {
		var x domain.Report
		if err := rows.Scan(&x.ID, &x.ListingID, &x.ReporterID, &x.Reason, &x.Status, &x.CreatedAt, &x.UpdatedAt); err != nil {
			return nil, 0, err
		}
		items = append(items, x)
	}
	var total int
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM reports WHERE ($1 = '' OR status=$1)`, status).Scan(&total); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *ReportRepoPG) UpdateStatus(ctx context.Context, id uuid.UUID, status string) (domain.Report, error) {
	_, err := r.db.Exec(ctx, `
		UPDATE reports SET status=$2, updated_at=now() WHERE id=$1`, id, status)
	if err != nil {
		return domain.Report{}, err
	}
	return r.GetByID(ctx, id)
}
