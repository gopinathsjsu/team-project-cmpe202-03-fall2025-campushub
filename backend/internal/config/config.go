package config

import (
	"fmt"

	"github.com/spf13/viper"
)

type Config struct {
	Env       string `mapstructure:"ENV"`     // dev|staging|prod
	HTTPPort  string `mapstructure:"PORT"`    // api port
	WSPort    string `mapstructure:"WS_PORT"` // ws port
	DBDSN     string `mapstructure:"DB_DSN"`  // postgres dsn
	JWTSecret string `mapstructure:"JWT_SECRET"`
	S3Bucket  string `mapstructure:"S3_BUCKET"`
}

func Load() (Config, error) {
	v := viper.New()
	fmt.Printf("Loading config from .env file and environment variables\n")
	v.SetConfigFile(".env")
	_ = v.ReadInConfig()
	v.AutomaticEnv()

	v.SetDefault("ENV", "dev")
	v.SetDefault("PORT", "8080")
	v.SetDefault("WS_PORT", "8081")

	var c Config
	if err := v.Unmarshal(&c); err != nil {
		return Config{}, err
	}
	return c, nil
}
