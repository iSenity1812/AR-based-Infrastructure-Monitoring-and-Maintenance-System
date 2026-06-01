package config

import (
	"fmt"

	"gopkg.in/yaml.v3"
)

// StringList lets YAML accept either a scalar string or a string array.
type StringList []string

func (s *StringList) UnmarshalYAML(value *yaml.Node) error {
	switch value.Kind {
	case yaml.ScalarNode:
		var single string
		if err := value.Decode(&single); err != nil {
			return err
		}
		*s = []string{single}
		return nil
	case yaml.SequenceNode:
		var many []string
		if err := value.Decode(&many); err != nil {
			return err
		}
		*s = many
		return nil
	default:
		return fmt.Errorf("expected string or string list, got yaml kind %d", value.Kind)
	}
}
