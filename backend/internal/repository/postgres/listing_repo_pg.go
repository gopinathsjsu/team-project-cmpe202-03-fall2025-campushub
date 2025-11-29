package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/domain"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/repository"
)

type ListingRepoPG struct{ db *pgxpool.Pool }

func NewListingRepo(db *pgxpool.Pool) *ListingRepoPG { return &ListingRepoPG{db: db} }

func (r *ListingRepoPG) Create(ctx context.Context, in repository.CreateListing) (domain.Listing, error) {
	id := uuid.New()
	now := time.Now().UTC()
	_, err := r.db.Exec(ctx, `
		INSERT INTO listings (id, seller_id, title, description, category, price, condition, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,$8)
	`, id, in.SellerID, in.Title, in.Description, in.Category, in.Price, string(in.Condition), now)
	if err != nil {
		return domain.Listing{}, err
	}

	return r.Get(ctx, id)
}

func (r *ListingRepoPG) Get(ctx context.Context, id uuid.UUID) (domain.Listing, error) {
	row := r.db.QueryRow(ctx, `
		SELECT id, seller_id, title, description, category, price, condition, status, created_at, updated_at
		FROM listings WHERE id = $1
	`, id)
	return scanListing(row)
}

func (r *ListingRepoPG) List(ctx context.Context, p repository.ListParams) ([]domain.Listing, int, error) {
	var (
		where []string
		args  []any
		i     = 1
	)

	if p.Status != "" {
		where = append(where, fmt.Sprintf("status = $%d", i))
		args = append(args, p.Status)
		i++
	}

	if p.SellerID != nil {
		where = append(where, fmt.Sprintf("seller_id = $%d", i))
		args = append(args, *p.SellerID)
		i++
	}

	if p.Category != "" {
		where = append(where, fmt.Sprintf("category = $%d", i))
		args = append(args, p.Category)
		i++
	}

	if p.Q != "" {
		where = append(where, fmt.Sprintf("(title ILIKE $%d OR description ILIKE $%d)", i, i+1))
		args = append(args, "%"+p.Q+"%", "%"+p.Q+"%")
		i += 2
	}

	if p.PriceMin != nil {
		where = append(where, fmt.Sprintf("price >= $%d", i))
		args = append(args, *p.PriceMin)
		i++
	}

	if p.PriceMax != nil {
		where = append(where, fmt.Sprintf("price <= $%d", i))
		args = append(args, *p.PriceMax)
		i++
	}

	// If no filters at all, add a harmless TRUE so WHERE clause is valid
	if len(where) == 0 {
		where = append(where, "TRUE")
	}

	order := "created_at DESC"
	switch p.Sort {
	case "price_asc":
		order = "price ASC, created_at DESC"
	case "price_desc":
		order = "price DESC, created_at DESC"
	}

	limit := 20
	if p.Limit > 0 {
		limit = p.Limit
	}
	offset := 0
	if p.Offset > 0 {
		offset = p.Offset
	}

	sql := fmt.Sprintf(`
		WITH base AS (
		  SELECT * FROM listings WHERE %s
		)
		SELECT id, seller_id, title, description, category, price, condition, status, created_at, updated_at
		FROM base
		ORDER BY %s
		LIMIT %d OFFSET %d
	`, strings.Join(where, " AND "), order, limit, offset)

	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var out []domain.Listing
	for rows.Next() {
		l, err := scanListing(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, l)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	// total count (same WHERE, same args)
	countSQL := fmt.Sprintf(`SELECT count(*) FROM listings WHERE %s`, strings.Join(where, " AND "))
	var total int
	if err := r.db.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	return out, total, nil
}

func (r *ListingRepoPG) UpdatePartial(ctx context.Context, id uuid.UUID, patch repository.UpdateListing) (domain.Listing, error) {
	var sets []string
	var args []any
	i := 1

	if patch.Title != nil {
		sets = append(sets, fmt.Sprintf("title=$%d", i))
		args = append(args, *patch.Title)
		i++
	}
	if patch.Description != nil {
		sets = append(sets, fmt.Sprintf("description=$%d", i))
		args = append(args, *patch.Description)
		i++
	}
	if patch.Category != nil {
		sets = append(sets, fmt.Sprintf("category=$%d", i))
		args = append(args, *patch.Category)
		i++
	}
	if patch.Price != nil {
		sets = append(sets, fmt.Sprintf("price=$%d", i))
		args = append(args, *patch.Price)
		i++
	}
	if patch.Condition != nil {
		sets = append(sets, fmt.Sprintf("condition=$%d", i))
		args = append(args, string(*patch.Condition))
		i++
	}
	if patch.Status != nil {
		sets = append(sets, fmt.Sprintf("status=$%d", i))
		args = append(args, string(*patch.Status))
		i++
	}

	if len(sets) == 0 {
		return r.Get(ctx, id)
	}

	args = append(args, id)
	sql := fmt.Sprintf(`UPDATE listings SET %s, updated_at=now() WHERE id=$%d`, strings.Join(sets, ", "), len(args))
	_, err := r.db.Exec(ctx, sql, args...)
	if err != nil {
		return domain.Listing{}, err
	}
	return r.Get(ctx, id)
}

func (r *ListingRepoPG) MarkSold(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `UPDATE listings SET status='sold', updated_at=now() WHERE id=$1`, id)
	return err
}

func (r *ListingRepoPG) SoftDelete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `UPDATE listings SET status='removed', updated_at=now() WHERE id=$1`, id)
	return err
}

func scanListing(row pgx.Row) (domain.Listing, error) {
	var l domain.Listing
	var cond string
	var status string
	err := row.Scan(&l.ID, &l.SellerID, &l.Title, &l.Description, &l.Category, &l.Price, &cond, &status, &l.CreatedAt, &l.UpdatedAt)
	if err != nil {
		return domain.Listing{}, err
	}
	l.Condition = domain.Condition(cond)
	l.Status = domain.ListingStatus(status)
	return l, nil
}
