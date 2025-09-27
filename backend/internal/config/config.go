package config

import (
	"fmt"

	"github.com/spf13/viper"
)

type Config struct {
	Env           string `mapstructure:"ENV"`
	HTTPPort      string `mapstructure:"PORT"`    // api port
	WSPort        string `mapstructure:"WS_PORT"` // ws port
	DBDSN         string `mapstructure:"DB_DSN"`  // postgres dsn
	JWTSecret     string `mapstructure:"JWT_SECRET"`
	S3Bucket      string `mapstructure:"S3_BUCKET"`
	S3Region      string `mapstructure:"S3_REGION"`
	S3Endpoint    string `mapstructure:"S3_ENDPOINT"`
	S3PathStyle   bool   `mapstructure:"S3_PATH_STYLE"`
	PresignExpiry int    `mapstructure:"PRESIGN_EXPIRY"`
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
	v.SetDefault("PRESIGN_EXPIRY", 15)
	v.SetDefault("S3_PATH_STYLE", false)

	var c Config
	if err := v.Unmarshal(&c); err != nil {
		return Config{}, err
	}
	return c, nil
}
