package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/domain"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/repository"
)

type ImageRepoPG struct{ db *pgxpool.Pool }

func NewImageRepo(db *pgxpool.Pool) *ImageRepoPG { return &ImageRepoPG{db: db} }

func (r *ImageRepoPG) Add(ctx context.Context, in repository.AddImage) (domain.ListingImage, error) {
	id := uuid.New()
	_, err := r.db.Exec(ctx, `
		INSERT INTO listing_images (id, listing_id, s3_key, is_primary, width, height)
		VALUES ($1,$2,$3,$4,$5,$6)
	`, id, in.ListingID, in.S3Key, in.IsPrimary, in.Width, in.Height)
	if err != nil {
		return domain.ListingImage{}, err
	}
	return r.get(ctx, id)
}

func (r *ImageRepoPG) get(ctx context.Context, id uuid.UUID) (domain.ListingImage, error) {
	var li domain.ListingImage
	err := r.db.QueryRow(ctx, `
		SELECT id, listing_id, s3_key, is_primary, width, height, created_at
		FROM listing_images WHERE id=$1
	`, id).Scan(&li.ID, &li.ListingID, &li.S3Key, &li.IsPrimary, &li.Width, &li.Height, &li.CreatedAt)
	return li, err
}

func (r *ImageRepoPG) ListByListing(ctx context.Context, listingID uuid.UUID) ([]domain.ListingImage, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, listing_id, s3_key, is_primary, width, height, created_at
		FROM listing_images WHERE listing_id=$1 ORDER BY is_primary DESC, created_at ASC
	`, listingID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []domain.ListingImage
	for rows.Next() {
		var li domain.ListingImage
		if err := rows.Scan(&li.ID, &li.ListingID, &li.S3Key, &li.IsPrimary, &li.Width, &li.Height, &li.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, li)
	}
	return out, rows.Err()
}

func (r *ImageRepoPG) SetPrimary(ctx context.Context, listingID, imageID uuid.UUID) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `UPDATE listing_images SET is_primary=false WHERE listing_id=$1`, listingID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `UPDATE listing_images SET is_primary=true WHERE id=$1 AND listing_id=$2`, imageID, listingID); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// internal/repository/postgres/image_repo_pg.go
func (r *ImageRepoPG) GetPrimary(ctx context.Context, listingID uuid.UUID) (*domain.ListingImage, error) {
	var li domain.ListingImage
	err := r.db.QueryRow(ctx, `
        SELECT id, listing_id, s3_key, is_primary, width, height, created_at
        FROM listing_images
        WHERE listing_id=$1
        ORDER BY is_primary DESC, created_at ASC
        LIMIT 1
    `, listingID).Scan(&li.ID, &li.ListingID, &li.S3Key, &li.IsPrimary, &li.Width, &li.Height, &li.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &li, nil
}

func (r *ImageRepoPG) Delete(ctx context.Context, imageID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM listing_images WHERE id=$1`, imageID)
	return err
}
