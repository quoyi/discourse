# frozen_string_literal: true

class ReviewableHistorySerializer < ApplicationSerializer
  attributes :id, :reviewable_history_type, :status, :created_at
  has_one :created_by, serializer: BasicUserSerializer, root: 'users'

  delegate :status_for_database, :reviewable_history_type_for_database, to: :object, private: true
  alias status status_for_database
  alias reviewable_history_type reviewable_history_type_for_database
end
