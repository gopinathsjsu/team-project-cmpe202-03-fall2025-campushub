package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"golang.org/x/crypto/bcrypt"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/config"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/repository/postgres"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}

	fmt.Printf("Connecting to database: %s\n", cfg.DBDSN)

	ctx := context.Background()
	pool, err := postgres.NewPool(ctx, cfg.DBDSN)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer pool.Close()

	authRepo := postgres.NewAuthRepo(pool)

	email := "devenjaimin.desai@sjsu.edu"
	password := "Deven@12345"

	fmt.Printf("\n=== Testing Authentication for: %s ===\n\n", email)

	// Step 1: Try to get user by email
	fmt.Println("Step 1: Getting user by email...")
	user, hash, err := authRepo.GetByEmail(ctx, email)
	if err != nil {
		fmt.Printf("❌ ERROR: Failed to get user: %v\n", err)
		fmt.Println("\nChecking if user exists in database...")
		
		// Check if user exists at all
		var count int
		err2 := pool.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE email = $1", email).Scan(&count)
		if err2 != nil {
			fmt.Printf("❌ ERROR querying database: %v\n", err2)
		} else {
			fmt.Printf("User count with email '%s': %d\n", email, count)
			if count == 0 {
				fmt.Println("❌ User does not exist in database!")
			} else {
				fmt.Println("⚠️  User exists but GetByEmail failed - possible case sensitivity issue")
			}
		}
		os.Exit(1)
	}

	fmt.Printf("✅ User found:\n")
	fmt.Printf("   ID: %s\n", user.ID)
	fmt.Printf("   Name: %s\n", user.Name)
	fmt.Printf("   Email: %s\n", user.Email)
	fmt.Printf("   Role: %s\n", user.Role)
	fmt.Printf("   Hash length: %d\n", len(hash))
	fmt.Printf("   Hash preview: %s...\n", hash[:30])

	// Step 2: Test password comparison
	fmt.Println("\nStep 2: Testing password comparison...")
	err = bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err != nil {
		fmt.Printf("❌ Password does NOT match: %v\n", err)
		
		// Try to see what the actual hash is
		fmt.Println("\nDebugging hash...")
		fmt.Printf("Hash stored: %s\n", hash)
		fmt.Printf("Password to test: %s\n", password)
		
		// Generate a new hash to compare
		newHash, err2 := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err2 != nil {
			fmt.Printf("Failed to generate new hash: %v\n", err2)
		} else {
			fmt.Printf("New hash for same password: %s\n", string(newHash))
			fmt.Println("⚠️  The stored hash might be for a different password")
		}
		os.Exit(1)
	}

	fmt.Println("✅ Password matches!")

	// Step 3: Test with different email variations
	fmt.Println("\nStep 3: Testing email case variations...")
	testEmails := []string{
		email,
		"Devenjaimin.Desai@sjsu.edu",
		"DEVENJAIMIN.DESAI@SJSU.EDU",
		" devenjaimin.desai@sjsu.edu ",
	}

	for _, testEmail := range testEmails {
		u, h, e := authRepo.GetByEmail(ctx, testEmail)
		if e == nil {
			fmt.Printf("✅ Found with: '%s'\n", testEmail)
			fmt.Printf("   Retrieved email: %s\n", u.Email)
			if h == hash {
				fmt.Println("   Hash matches stored hash")
			}
		} else {
			fmt.Printf("❌ Not found with: '%s'\n", testEmail)
		}
	}

	fmt.Println("\n=== Authentication Debug Complete ===")
}

