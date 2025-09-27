package s3client

import (
	"context"
	"net/http"
	"time"

	awsV2 "github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type Client struct {
	bucket string
	s3     *s3.Client
}

type Opts struct {
	Region         string
	Bucket         string
	Endpoint       string
	ForcePathStyle bool
}

func New(ctx context.Context, o Opts) (*Client, error) {
	var loadOpts []func(*config.LoadOptions) error
	if o.Region != "" {
		loadOpts = append(loadOpts, config.WithRegion(o.Region))
	}
	if o.Endpoint != "" {
		resolver := awsV2.EndpointResolverWithOptionsFunc(func(service, region string, _ ...interface{}) (awsV2.Endpoint, error) {
			if service == s3.ServiceID {
				return awsV2.Endpoint{
					PartitionID:   "aws",
					URL:           o.Endpoint,
					SigningRegion: o.Region,
				}, nil
			}
			return awsV2.Endpoint{}, &awsV2.EndpointNotFoundError{}
		})
		loadOpts = append(loadOpts, config.WithEndpointResolverWithOptions(resolver))
	}
	cfg, err := config.LoadDefaultConfig(ctx, loadOpts...)
	if err != nil {
		return nil, err
	}

	cl := s3.NewFromConfig(cfg, func(so *s3.Options) {
		if o.ForcePathStyle {
			so.UsePathStyle = true
		}
	})

	return &Client{bucket: o.Bucket, s3: cl}, nil
}

type PresignPut struct {
	URL     string      `json:"url"`
	Headers http.Header `json:"headers"`
	Key     string      `json:"key"`
}

func (c *Client) PresignPut(ctx context.Context, key, contentType string, expires time.Duration) (PresignPut, error) {
	ps := s3.NewPresignClient(c.s3, func(po *s3.PresignOptions) {
		po.Expires = expires
	})
	req, err := ps.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      &c.bucket,
		Key:         &key,
		ContentType: &contentType,
	}, func(po *s3.PresignOptions) {})
	if err != nil {
		return PresignPut{}, err
	}

	h := http.Header{}
	for k, v := range req.SignedHeader {
		for _, vv := range v {
			h.Add(k, vv)
		}
	}
	return PresignPut{URL: req.URL, Headers: h, Key: key}, nil
}

func (c *Client) Bucket() string { return c.bucket }
